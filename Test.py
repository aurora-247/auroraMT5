import MT5Manager

# Create manager and admin objects
manager = MT5Manager.ManagerAPI()
admin = MT5Manager.AdminAPI()

if admin.Connect("demo.forexriver.net:437", 1017, "0nR*RgRb", 0, 3000000):
    try:
        total_groups = admin.GroupTotal()  # Hypothetical function that returns the count
        print(f"total groups: {total_groups}")
        if total_groups > 0:
            for i in range(total_groups):
                # Retrieve the group configuration by index.
                # The actual method name might be GroupNext, GroupsRequest, etc.
                group_obj = admin.GroupNext(i)
                if group_obj:
                    # Print the group name from the property (getter)
                    print("Group {}: {}".format(i, group_obj.Group))
                else:
                    print("No group object returned for index", i)
        else:
            print("No groups found")
    except AttributeError:
        print("The AdminAPI does not expose a groups enumeration method with this name.")
    finally:
        manager.Disconnect()
else:
    print("Failed to connect:", MT5Manager.LastError())
