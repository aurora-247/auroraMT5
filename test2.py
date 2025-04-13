import MT5Manager


def print_commission_range_details(tier):
    """Print all non-callable attributes for a commission tier object."""
    print("         Commission Tier Details:")
    for attr in dir(tier):
        if not attr.startswith('_'):
            value = getattr(tier, attr)
            if callable(value):
                continue
            print(f"            {attr}: {value}")


def print_commission_details(commission):
    """Print commission details and enumerate its commission tiers (ranges)."""
    print("    Commission Details:")
    # Print commission-level attributes
    for attr in dir(commission):
        if not attr.startswith('_'):
            value = getattr(commission, attr)
            if callable(value):
                continue
            print(f"       {attr}: {value}")

    # Enumerate commission tiers using TierTotal and TierNext if available
    if (hasattr(commission, "TierTotal") and callable(commission.TierTotal) and
            hasattr(commission, "TierNext") and callable(commission.TierNext)):
        try:
            tier_total = commission.TierTotal()
        except Exception as ex:
            print("       Error retrieving tier total:", ex)
            tier_total = 0
        print("       Commission Tier Count:", tier_total)
        for r in range(tier_total):
            try:
                tier = commission.TierNext(r)
                if tier:
                    print(f"       Commission Tier {r} Details:")
                    print_commission_range_details(tier)
                else:
                    print(f"       Commission Tier {r} not available")
            except Exception as ex:
                print(f"       Error retrieving commission tier {r}:", ex)
    else:
        print("       Commission tier enumeration is not available.")


def print_symbol_details(symbol_setting):
    """Print all non-callable attributes for a symbol setting object."""
    print("    Symbol Details:")
    # Always print the symbol path first, if available
    if hasattr(symbol_setting, "Path"):
        print("       Path:", symbol_setting.Path)
    # Then print other available attributes
    for attr in dir(symbol_setting):
        if not attr.startswith('_') and attr != "Path":
            value = getattr(symbol_setting, attr)
            if callable(value):
                continue
            print(f"       {attr}: {value}")


def print_group_configuration(group):
    """Print group configuration details, including commissions (and their tiers) and symbols."""
    print("--------------------------------------------------")
    print("Group Name:           ", group.Group)
    print("Server ID:            ", group.Server)
    if hasattr(group, "PermissionsFlags"):
        print("Permission Flags:     ", group.PermissionsFlags)
    else:
        print("Permission Flags:     Not available")
    print("Auth Mode:            ", group.AuthMode)
    print("Company:              ", group.Company)

    # Commission settings
    try:
        total_commissions = group.CommissionTotal()
    except AttributeError:
        total_commissions = 0
    print("Commission Settings:  Count =", total_commissions)
    for idx in range(total_commissions):
        commission = group.CommissionNext(idx)
        print(f"  Commission[{idx}]:")
        print_commission_details(commission)

    # Symbol settings
    try:
        total_symbols = group.SymbolTotal()
    except AttributeError:
        total_symbols = 0
    print("Symbol Settings:      Count =", total_symbols)
    for idx in range(total_symbols):
        symbol_setting = group.SymbolNext(idx)
        print(f"  Symbol[{idx}]:")
        print_symbol_details(symbol_setting)
    print("--------------------------------------------------\n")


# Main script: Connect to the server, retrieve groups, and display configuration details
manager = MT5Manager.ManagerAPI()
admin = MT5Manager.AdminAPI()

# Adjust connection parameters as needed
connection_params = ("trade.mahfaza.com.jo:443", 1010, "Mahfaza@5050", 0, 3000)

if admin.Connect(*connection_params):
    try:
        total_groups = admin.GroupTotal()
        print(f"Total groups: {total_groups}")
        for pos in range(total_groups):
            group_obj = admin.GroupNext(pos)
            if group_obj is not None:
                print(f"Retrieved group at index {pos}:")
                print_group_configuration(group_obj)
            else:
                print(f"No group object returned for index {pos}")
    except Exception as e:
        print("An exception occurred:", e)
    finally:
        admin.Disconnect()
else:
    print("Failed to connect:", MT5Manager.LastError())
