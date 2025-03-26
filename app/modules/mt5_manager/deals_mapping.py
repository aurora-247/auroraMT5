def parse_deal(deal):
    """
    Parse a deal object and return a dictionary containing all the details.
    Converts numeric enumerations into human-readable strings according to the documentation.
    """

    # Mapping for IMTDeal::EnDealAction
    deal_action_map = {
        0: "Buy",
        1: "Sell",
        2: "Balance",
        3: "Credit",
        4: "Charge",
        5: "Correction",
        6: "Bonus",
        7: "Commission",
        8: "Daily Commission",
        9: "Monthly Commission",
        10: "Daily Agent Commission",
        11: "Monthly Agent Commission",
        12: "Interest Rate",
        13: "Buy Canceled",
        14: "Sell Canceled",
        15: "Dividend",
        16: "Dividend Franked",
        17: "Tax",
        18: "Agent",
        19: "Stop Out Compensation",
        20: "Stop Out Compensation Credit",
    }

    # Mapping for IMTDeal::EnDealEntry
    deal_entry_map = {
        0: "Entry In",
        1: "Entry Out",
        2: "Entry InOut",
        3: "Entry Out By",
    }

    # Mapping for IMTDeal::EnDealReason
    deal_reason_map = {
        0: "Client",
        1: "Expert",
        2: "Dealer",
        3: "Stop Loss",
        4: "Take Profit",
        5: "Stop Out",
        6: "Rollover",
        7: "External Client",
        8: "Variation Margin",
        9: "Gateway",
        10: "Signal",
        11: "Settlement",
        12: "Transfer",
        13: "Sync",
        14: "External Service",
        15: "Migration",
        16: "Mobile",
        17: "Web",
        18: "Split",
        19: "Corporate Action",
    }

    # Mapping for IMTDeal::EnTradeModifyFlags
    modify_flags_map = {
        0x00000001: "Admin",
        0x00000002: "Manager",
        0x00000004: "Position",
        0x00000008: "Restore",
        0x00000010: "API Admin",
        0x00000020: "API Manager",
        0x00000040: "API Server",
        0x00000080: "API Gateway",
    }

    def parse_modify_flags(flags_value):
        if not flags_value:
            return "None"
        result = []
        for bit, desc in modify_flags_map.items():
            if flags_value & bit:
                result.append(desc)
        if not result:
            return "None"
        return ", ".join(result)

    # Get raw numeric values from the deal object
    action_value = getattr(deal, "Action", None)
    entry_value = getattr(deal, "Entry", None)
    reason_value = getattr(deal, "Reason", None)
    modification_flags_value = getattr(deal, "ModificationFlags", None)

    # Convert numeric values to readable strings using our maps
    action_str = deal_action_map.get(action_value, action_value)
    entry_str = deal_entry_map.get(entry_value, entry_value)
    reason_str = deal_reason_map.get(reason_value, reason_value)
    modification_flags_str = parse_modify_flags(modification_flags_value)

    return {
        "ticket": getattr(deal, "Deal", "Unknown"),
        "external_id": getattr(deal, "ExternalID", None),
        "login": getattr(deal, "Login", None),
        "dealer": getattr(deal, "Dealer", None),
        "order": getattr(deal, "Order", None),
        "action": action_str,
        "entry": entry_str,
        "digits": getattr(deal, "Digits", None),
        "digits_currency": getattr(deal, "DigitsCurrency", None),
        "contract_size": getattr(deal, "ContractSize", None),
        "time": getattr(deal, "Time", None),
        "symbol": getattr(deal, "Symbol", None),
        "price": getattr(deal, "Price", None),
        "price_sl": getattr(deal, "PriceSL", None),
        "price_tp": getattr(deal, "PriceTP", None),
        "volume": getattr(deal, "Volume", None),
        "volume_ext": getattr(deal, "VolumeExt", None),
        "volume_closed": getattr(deal, "VolumeClosed", None),
        "volume_closed_ext": getattr(deal, "VolumeClosedExt", None),
        "profit": getattr(deal, "Profit", None),
        "value": getattr(deal, "Value", None),
        "storage": getattr(deal, "Storage", None),
        "commission": getattr(deal, "Commission", None),
        "fee": getattr(deal, "Fee", None),
        "rate_profit": getattr(deal, "RateProfit", None),
        "rate_margin": getattr(deal, "RateMargin", None),
        "expert_id": getattr(deal, "ExpertID", None),
        "position_id": getattr(deal, "PositionID", None),
        "comment": getattr(deal, "Comment", None),
        "api_data_set": getattr(deal, "ApiDataSet", None),
        "api_data_update": getattr(deal, "APIDataUpdate", None),
        "api_data_next": getattr(deal, "APIDataNext", None),
        "api_data_get": getattr(deal, "ApiDataGet", None),
        "api_data_clear": getattr(deal, "ApiDataClear", None),
        "api_data_clear_all": getattr(deal, "ApiDataClearAll", None),
        "profit_raw": getattr(deal, "ProfitRaw", None),
        "price_position": getattr(deal, "PricePosition", None),
        "tick_value": getattr(deal, "TickValue", None),
        "tick_size": getattr(deal, "TickSize", None),
        "flags": getattr(deal, "Flags", None),
        "time_msc": getattr(deal, "TimeMsc", None),
        "reason": reason_str,
        "gateway": getattr(deal, "Gateway", None),
        "price_gateway": getattr(deal, "PriceGateway", None),
        "market_bid": getattr(deal, "MarketBid", None),
        "market_ask": getattr(deal, "MarketAsk", None),
        "market_last": getattr(deal, "MarketLast", None),
        "modification_flags": modification_flags_str,
    }