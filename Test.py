# include the library
import MT5Manager
# include library for handling dates
import datetime
# create manager interface
manager = MT5Manager.ManagerAPI()
# connect the server
if manager.Connect("demo.forexriver.net:437", 1017, "0nR*RgRb", 0, 3000000):
    # request deal history up to the current moment
    date_to = datetime.datetime.now()
    # # request deal history for last 100 days
    date_from = date_to - datetime.timedelta(days=100)
    # # request deal history
    # deals = manager.DealRequestPage(10004279, from = date_from, to = date_to, 0,10)
    deals = manager.DealRequestByGroup("demo\\RP\\PRO, demo\\RP\\Prime", date_from, date_to)
    if deals == False:
        # request failed with error
        print(f"Failed to request deals: {MT5Manager.LastError()}")
    else:
        # display total number of deals
        print(f"Get {len(deals)} deals")
        # display all balance deals
        # for deal in deals:
            # if deal.Action == MT5Manager.MTDeal.EnDealAction.DEAL_BALANCE:
           # print(deal.Print())
    # disconnect from the server
    manager.Disconnect()
else:
    # failed to connect to the server
    print(f"Failed to connect to server: {MT5Manager.LastError()}")