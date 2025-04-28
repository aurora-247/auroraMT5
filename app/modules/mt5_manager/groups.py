# groups.py

from fastapi import HTTPException
import MT5Manager
import inspect
from app.modules.mt5_manager.manager import mt5_managers

# ———————————————————————————————————————————————
# 1. Build a shared enum‐map from all IMTConGroup + symbol enums
# ———————————————————————————————————————————————

_enum_maps = {}
_symbol_enums_loaded = False

def _load_group_enums():
    for attr in dir(MT5Manager.MTConGroup):
        if not attr.startswith("En"):
            continue
        enum_cls = getattr(MT5Manager.MTConGroup, attr)
        if inspect.isclass(enum_cls):
            members = {
                name: getattr(enum_cls, name)
                for name in dir(enum_cls)
                if name.isupper()
            }
            if members:
                _enum_maps[attr] = members

_load_group_enums()

def _load_symbol_enums(symbol):
    """Inspect the symbol's class once and pull in its En… nested enums."""
    global _symbol_enums_loaded
    if _symbol_enums_loaded:
        return
    sym_cls = symbol.__class__
    for attr in dir(sym_cls):
        if not attr.startswith("En"):
            continue
        enum_cls = getattr(sym_cls, attr)
        if inspect.isclass(enum_cls):
            members = {
                name: getattr(enum_cls, name)
                for name in dir(enum_cls)
                if name.isupper()
            }
            if members:
                _enum_maps[attr] = members
    _symbol_enums_loaded = True

def _map_enum(enum_name: str, raw_value):
    """Turn raw_value into its enum name(s), or fall back to the number."""
    members = _enum_maps.get(enum_name)
    if members is None or raw_value is None:
        return raw_value
    # 1) exact match?
    for name, val in members.items():
        if raw_value == val:
            return name
    # 2) flag-style (bitmask) – collect all that fit
    flags = [
        name for name, val in members.items()
        if isinstance(val, int) and val != 0 and (raw_value & val) == val
    ]
    if flags:
        return flags
    return raw_value

# ———————————————————————————————————————————————
# 2. Main function
# ———————————————————————————————————————————————

def get_group_configurations(identifier: str):
    """
    Retrieve group configurations using the active MT5 Manager connection
    identified by 'identifier', with *all* enums decoded to names.
    """
    if identifier not in mt5_managers:
        return {"error": f"Manager instance '{identifier}' not found."}

    mgr = mt5_managers[identifier]
    if not mgr.connected and not mgr.connect():
        return {"error": f"Failed to connect manager '{identifier}': {MT5Manager.LastError()}"}

    try:
        groups = mgr.manager.GroupRequestArray()
        if groups is None:
            return {"error": "No groups found."}

        result = []
        for grp in groups:
            # — Basic group info —
            data = {
                "group_name": getattr(grp, "Group", None),
                "server_id":  getattr(grp, "Server", None),
                "company":    getattr(grp, "Company", None),
            }

            # — Decode every group‐level enum (EnXYZ → XYZ) —
            for enum_name in list(_enum_maps):
                prop = enum_name[2:]               # drop "En"
                if hasattr(grp, prop):
                    raw = getattr(grp, prop)
                    data[prop] = _map_enum(enum_name, raw)

            # — Commissions (unchanged) —
            data["commissions"] = []
            try:
                ctot = grp.CommissionTotal()
            except Exception:
                ctot = 0
            for i in range(ctot):
                comm = grp.CommissionNext(i)
                tiers = []
                try:
                    ttot = comm.TierTotal()
                except Exception:
                    ttot = 0
                for j in range(ttot):
                    tier = comm.TierNext(j)
                    tiers.append({
                        "range_from": getattr(tier, "RangeFrom", None),
                        "range_to":   getattr(tier, "RangeTo",   None),
                        "value":      getattr(tier, "Value",     None),
                    })
                data["commissions"].append({
                    "name": getattr(comm, "Name", None),
                    "tiers": tiers
                })

            # — Symbols + dynamic enum mapping —
            data["symbols"] = []
            try:
                stot = grp.SymbolTotal()
            except Exception:
                stot = 0

            for i in range(stot):
                sym = grp.SymbolNext(i)

                # load symbol enums once
                _load_symbol_enums(sym)

                # grab every public, non‐callable field
                fields = [
                    a for a in dir(sym)
                    if not a.startswith("_")
                    and not callable(getattr(sym, a, None))
                ]
                sym_data = {}
                for f in fields:
                    try:
                        sym_data[f] = getattr(sym, f)
                    except Exception:
                        sym_data[f] = None

                # map any enums on the symbol
                for enum_name in list(_enum_maps):
                    prop = enum_name[2:]
                    if prop in sym_data:
                        sym_data[prop] = _map_enum(enum_name, sym_data[prop])

                data["symbols"].append(sym_data)

            result.append(data)

        return result

    except Exception as e:
        # you could also raise HTTPException(500, detail=str(e)) here
        return {"error": str(e)}
