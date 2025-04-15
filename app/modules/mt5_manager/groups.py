# groups.py
from fastapi import HTTPException
import MT5Manager
from app.modules.mt5_manager.manager import mt5_managers

def get_group_configurations(identifier: str):
    """
    Retrieve group configurations using the active MT5 Manager connection
    identified by 'identifier'.
    """
    if identifier not in mt5_managers:
        return {"error": f"Manager instance with identifier '{identifier}' not found."}

    manager_instance = mt5_managers[identifier]
    if not manager_instance.connected:
        if not manager_instance.connect():
            return {"error": f"Failed to connect using manager {identifier}: {MT5Manager.LastError()}"}

    try:
        group_array = manager_instance.manager.GroupRequestArray()
        if group_array is None:
            return {"error": "No groups found."}
        groups_list = []
        for group in group_array:
            group_data = {
                "group_name": getattr(group, "Group", "Unknown"),
                "server_id": getattr(group, "Server", "Unknown"),
                "permissions": getattr(group, "PermissionsFlags", None),
                "auth_mode": getattr(group, "AuthMode", None),
                "company": getattr(group, "Company", None),
                "commissions": [],
                "symbols": []
            }

            # Process commissions if available.
            try:
                commission_total = group.CommissionTotal()
            except Exception:
                commission_total = 0
            for idx in range(commission_total):
                comm = group.CommissionNext(idx)
                tiers = []
                try:
                    tier_total = comm.TierTotal()
                except Exception:
                    tier_total = 0
                for tier_idx in range(tier_total):
                    tier = comm.TierNext(tier_idx)
                    tier_data = {
                        "range_from": tier.RangeFrom,
                        "range_to": tier.RangeTo,
                        "value": tier.Value
                    }
                    tiers.append(tier_data)
                commission_data = {
                    "name": getattr(comm, "Name", None),
                    "tiers": tiers
                }
                group_data["commissions"].append(commission_data)

            # Process symbols if available.
            try:
                symbol_total = group.SymbolTotal()
            except Exception:
                symbol_total = 0
            for idx in range(symbol_total):
                symbol = group.SymbolNext(idx)
                symbol_data = {
                    "path": getattr(symbol, "Path", None),
                    "trade_mode": getattr(symbol, "TradeMode", None)
                }
                group_data["symbols"].append(symbol_data)

            groups_list.append(group_data)
        return groups_list
    except Exception as e:
        return {"error": str(e)}