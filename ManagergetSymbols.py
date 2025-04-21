# ManagerSymbolsNoCreate.py

import MT5Manager

def print_symbol_details(symbol):
    """
    Print all non‐callable attributes of a symbol configuration object.
    """
    print("--------------------------------------------------")
    for attr in dir(symbol):
        if attr.startswith('_'):
            continue
        value = getattr(symbol, attr)
        if callable(value):
            continue
        print(f"{attr:20}: {value}")
    print("--------------------------------------------------\n")

def main():
    # 1. Instantiate AdminAPI
    admin = MT5Manager.AdminAPI()

    # 2. Connection parameters:
    conn = (
        "trade.mahfaza.com.jo:443",  # MT5 Manager host:port
        1010,                        # manager login
        "Mahfaza@5050",              # manager password
        0,                           # reserved (must be 0)
        3000                         # timeout in milliseconds
    )

    # 3. Connect
    if not admin.Connect(*conn):
        print("❌ Failed to connect:", MT5Manager.LastError())
        return

    try:
        # 4. Get the total number of symbol configurations
        total = admin.SymbolTotal()
        print(f"Total symbol configurations: {total}\n")

        # 5. Enumerate all symbols by index
        for idx in range(total):
            symbol_cfg = admin.SymbolNext(idx)
            if symbol_cfg:
                print(f"Symbol [{idx}]:")
                print_symbol_details(symbol_cfg)
            else:
                print(f"⚠️ SymbolNext returned None for index {idx}")

        # 6. Fetch a symbol by name
        demo_name = "EURUSD"
        symbol_cfg = admin.SymbolGet(demo_name)
        if symbol_cfg:
            print(f"Details for symbol '{demo_name}':")
            print_symbol_details(symbol_cfg)
        else:
            print(f"⚠️ SymbolGet('{demo_name}') returned None")

    finally:
        # 7. Always disconnect
        admin.Disconnect()
        print("🔌 Disconnected from MT5 Manager.")

if __name__ == "__main__":
    main()
