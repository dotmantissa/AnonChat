import { createAdminClient, createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

const ROOM_CHILD_TABLES = [
  { table: "messages", column: "room_id" },
  { table: "room_removal_votes", column: "room_id" },
  { table: "encrypted_file_references", column: "room_id" },
  { table: "invites", column: "room_id" },
  { table: "group_membership", column: "group_id" },
  { table: "room_members", column: "room_id" },
] as const

type SupabaseError = {
  code?: string
  message?: string
}

type DeleteRoomResult = {
  deleted_room_id?: string
  deleted_messages?: number
  deleted_room_members?: number
  deleted_room_removal_votes?: number
  deleted_group_memberships?: number
  deleted_invites?: number
  deleted_file_references?: number
}

function isMissingRelationError(error: SupabaseError) {
  return error.code === "42P01" || error.message?.includes("does not exist")
}

function isMissingFunctionError(error: SupabaseError) {
  return error.code === "42883" || error.code === "PGRST202"
}

async function deleteRoomWithAdminClient(roomId: string, userId: string) {
  const adminSupabase = createAdminClient()

  const { data: room, error: roomError } = await adminSupabase
    .from("rooms")
    .select("id, created_by")
    .eq("id", roomId)
    .maybeSingle()

  if (roomError) {
    console.error("[rooms/delete] room lookup error:", roomError)
    return NextResponse.json({ error: "Failed to verify room ownership" }, { status: 500 })
  }

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  if (room.created_by !== userId) {
    return NextResponse.json(
      { error: "Forbidden. Only the group owner can delete this group." },
      { status: 403 }
    )
  }

  const cleanupCounts: Record<string, number> = {}

  for (const { table, column } of ROOM_CHILD_TABLES) {
    const { count, error } = await adminSupabase
      .from(table)
      .delete({ count: "exact" })
      .eq(column, roomId)

    if (error) {
      if (isMissingRelationError(error)) {
        console.warn(`[rooms/delete] skipping missing cleanup table ${table}:`, error.message)
        cleanupCounts[table] = 0
        continue
      }

      console.error(`[rooms/delete] failed to clean up ${table}:`, error)
      return NextResponse.json(
        { error: `Failed to clean up related ${table.replaceAll("_", " ")}` },
        { status: 500 }
      )
    }

    cleanupCounts[table] = count ?? 0
  }

  const { error: deleteError } = await adminSupabase.from("rooms").delete().eq("id", roomId)

  if (deleteError) {
    console.error("[rooms/delete] room deletion error:", deleteError)
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    deleted_room_id: roomId,
    cleanup: cleanupCounts,
    message: "Group deleted successfully",
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("[rooms/delete] auth error:", authError)
      return NextResponse.json({ error: "Unable to verify authentication" }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { roomId } = await params
    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .rpc("delete_room_as_owner", { p_room_id: roomId })
      .maybeSingle()

    if (error) {
      if (error.code === "P0002") {
        return NextResponse.json({ error: "Room not found" }, { status: 404 })
      }

      if (error.code === "42501") {
        return NextResponse.json(
          { error: "Forbidden. Only the group owner can delete this group." },
          { status: 403 }
        )
      }

      if (!isMissingFunctionError(error)) {
        console.error("[rooms/delete] transactional delete error:", error)
        return NextResponse.json({ error: "Failed to delete group" }, { status: 500 })
      }

      console.warn("[rooms/delete] delete_room_as_owner RPC unavailable; using API fallback")
      return deleteRoomWithAdminClient(roomId, user.id)
    }

    const result = data as DeleteRoomResult | null

    return NextResponse.json({
      success: true,
      deleted_room_id: result?.deleted_room_id ?? roomId,
      cleanup: {
        messages: result?.deleted_messages ?? 0,
        room_removal_votes: result?.deleted_room_removal_votes ?? 0,
        encrypted_file_references: result?.deleted_file_references ?? 0,
        invites: result?.deleted_invites ?? 0,
        group_membership: result?.deleted_group_memberships ?? 0,
        room_members: result?.deleted_room_members ?? 0,
      },
      message: "Group deleted successfully",
    })
  } catch (error) {
    console.error("[rooms/delete] unexpected error:", error)
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 })
  }
}
