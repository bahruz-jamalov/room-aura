// /rooms — floors, rooms, and live occupancy (docs/ARCHITECTURE.md section
// 6: "floors, rooms, active guest session, access status"). Access token
// status itself lives on the dedicated /access screen; this shows just
// whether a room currently has a live guest session.
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import SidePanel, { FormField } from "../components/SidePanel";
import { useFloorsAdmin, type AdminFloor } from "../hooks/useFloorsAdmin";
import { useRoomsAdmin, type AdminRoom } from "../hooks/useRoomsAdmin";
import { card, dangerButton, primaryButton, secondaryButton, selectInput, textInput } from "../lib/styles";
import { supabase } from "../supabase";

export default function RoomsScreen() {
  const { staff } = useAuth();
  const { floors, loading: floorsLoading, reload: reloadFloors } = useFloorsAdmin();
  const { rooms, loading: roomsLoading, reload: reloadRooms } = useRoomsAdmin();
  const [editingFloor, setEditingFloor] = useState<AdminFloor | "new" | null>(null);
  const [editingRoom, setEditingRoom] = useState<AdminRoom | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reloadBoth() {
    await Promise.all([reloadFloors(), reloadRooms()]);
  }

  async function handleDeleteFloor(floor: AdminFloor) {
    if (!confirm(`Delete floor ${floor.number}? Rooms on it will become unassigned, not deleted.`)) return;
    const { error: deleteError } = await supabase.from("floors").delete().eq("id", floor.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setError(null);
    await reloadBoth();
  }

  async function handleDeleteRoom(room: AdminRoom) {
    if (!confirm(`Delete room ${room.number}? This only works if it has no requests on record.`)) return;
    const { error: deleteError } = await supabase.from("rooms").delete().eq("id", room.id);
    if (deleteError) {
      setError(`Couldn't delete room ${room.number} — it has requests on record. Deactivate it instead.`);
      return;
    }
    setError(null);
    await reloadRooms();
  }

  return (
    <div>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>Rooms</h1>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "var(--ra-space-6) 0 var(--ra-space-3)" }}>
        <h2 style={{ fontSize: "var(--ra-text-lg)", margin: 0 }}>Floors</h2>
        <button style={secondaryButton} onClick={() => setEditingFloor("new")}>
          + Add Floor
        </button>
      </div>
      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Number", "Label", ""].map((h) => (
                <th key={h} style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {floorsLoading ? (
              <tr>
                <td colSpan={3} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  Loading…
                </td>
              </tr>
            ) : floors.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No floors yet.
                </td>
              </tr>
            ) : (
              floors.map((f) => (
                <tr key={f.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{f.number}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{f.label ?? "—"}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditingFloor(f)}>
                      Edit
                    </button>
                    <button style={dangerButton} onClick={() => void handleDeleteFloor(f)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "var(--ra-space-6) 0 var(--ra-space-3)" }}>
        <h2 style={{ fontSize: "var(--ra-text-lg)", margin: 0 }}>Rooms</h2>
        <button style={primaryButton} onClick={() => setEditingRoom("new")}>
          + Add Room
        </button>
      </div>
      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Room", "Floor", "Status", "Guest session", ""].map((h) => (
                <th key={h} style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roomsLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  Loading…
                </td>
              </tr>
            ) : rooms.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No rooms yet.
                </td>
              </tr>
            ) : (
              rooms.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{r.number}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{r.floor_label ?? "—"}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{r.is_active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>
                    {r.hasActiveGuestSession ? (
                      <span style={{ color: "var(--ra-status-in-progress)", fontWeight: 600 }}>Occupied</span>
                    ) : (
                      <span style={{ color: "var(--ra-color-text-secondary)" }}>Vacant</span>
                    )}
                  </td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditingRoom(r)}>
                      Edit
                    </button>
                    <button style={dangerButton} onClick={() => void handleDeleteRoom(r)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingFloor && staff && (
        <FloorForm
          floor={editingFloor === "new" ? null : editingFloor}
          hotelId={staff.hotelId}
          nextSortOrder={floors.length}
          onClose={() => setEditingFloor(null)}
          onSaved={async () => {
            setEditingFloor(null);
            await reloadBoth();
          }}
        />
      )}

      {editingRoom && staff && (
        <RoomForm
          room={editingRoom === "new" ? null : editingRoom}
          hotelId={staff.hotelId}
          floors={floors}
          onClose={() => setEditingRoom(null)}
          onSaved={async () => {
            setEditingRoom(null);
            await reloadRooms();
          }}
        />
      )}
    </div>
  );
}

function FloorForm({
  floor,
  hotelId,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  floor: AdminFloor | null;
  hotelId: string;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [number, setNumber] = useState(floor?.number.toString() ?? "");
  const [label, setLabel] = useState(floor?.label ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const parsedNumber = parseInt(number, 10);
    if (Number.isNaN(parsedNumber)) return;
    setBusy(true);
    setError(null);
    const { error: saveError } = floor
      ? await supabase.from("floors").update({ number: parsedNumber, label: label.trim() || null }).eq("id", floor.id)
      : await supabase
          .from("floors")
          .insert({ hotel_id: hotelId, number: parsedNumber, label: label.trim() || null, sort_order: nextSortOrder });
    setBusy(false);
    if (saveError) {
      setError(saveError.message.includes("duplicate") ? "A floor with that number already exists." : saveError.message);
      return;
    }
    onSaved();
  }

  return (
    <SidePanel title={floor ? "Edit Floor" : "Add Floor"} onClose={onClose}>
      <FormField label="Number">
        <input style={textInput} type="number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. 5" />
      </FormField>
      <FormField label="Label (optional)">
        <input style={textInput} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Executive Floor" />
      </FormField>

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button style={primaryButton} disabled={busy || !number.trim()} onClick={() => void handleSubmit()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </SidePanel>
  );
}

function RoomForm({
  room,
  hotelId,
  floors,
  onClose,
  onSaved,
}: {
  room: AdminRoom | null;
  hotelId: string;
  floors: AdminFloor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [number, setNumber] = useState(room?.number ?? "");
  const [floorId, setFloorId] = useState(room?.floor_id ?? "");
  const [isActive, setIsActive] = useState(room?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!number.trim()) return;
    setBusy(true);
    setError(null);
    const payload = { number: number.trim(), floor_id: floorId || null, is_active: isActive };
    const { error: saveError } = room
      ? await supabase.from("rooms").update(payload).eq("id", room.id)
      : await supabase.from("rooms").insert({ hotel_id: hotelId, ...payload });
    setBusy(false);
    if (saveError) {
      setError(saveError.message.includes("duplicate") ? "A room with that number already exists." : saveError.message);
      return;
    }
    onSaved();
  }

  return (
    <SidePanel title={room ? "Edit Room" : "Add Room"} onClose={onClose}>
      <FormField label="Room number">
        <input style={textInput} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. 508" />
      </FormField>
      <FormField label="Floor">
        <select style={selectInput} value={floorId} onChange={(e) => setFloorId(e.target.value)}>
          <option value="">No floor</option>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label ?? `Floor ${f.number}`}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Status">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </FormField>

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button style={primaryButton} disabled={busy || !number.trim()} onClick={() => void handleSubmit()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </SidePanel>
  );
}
