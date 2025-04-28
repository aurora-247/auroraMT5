import MT5Manager

def print_user_details(user):
    """Print all public, non-callable attributes of an IMTUserRecord."""
    print("    User Details:")
    # gather all attrs that don’t start with “_” and aren’t methods
    attrs = [
        name for name in dir(user)
        if not name.startswith('_')
           and not callable(getattr(user, name))
    ]
    # print them in alphabetical order
    for name in sorted(attrs):
        print(f"       {name}: {getattr(user, name)}")

manager = MT5Manager.ManagerAPI()
if not manager.Connect(
    "trade.mahfaza.com.jo:443", 1010, "Mahfaza@5050",
    MT5Manager.ManagerAPI.EnPumpModes.PUMP_MODE_USERS,
    3000
):
    print("Failed to connect:", MT5Manager.LastError())
    exit(1)

# fetch all users
users = manager.UserGetByGroup("*")
if users is False:
    print("Error fetching users:", MT5Manager.LastError())
else:
    print(f"Fetched {len(users)} users")
    for user in users:
        print_user_details(user)

manager.Disconnect()
