import psutil
import platform
import socket
import os
import logging

logger = logging.getLogger(__name__)

def get_system_info():
    """
    Retrieves detailed system information including CPU, memory, disk, and network specs.
    """
    try:
        system_info = {
            "OS": platform.system(),
            "OS Version": platform.version(),
            "OS Release": platform.release(),
            "Architecture": platform.architecture()[0],
            "CPU": platform.processor(),
            "Total Cores": psutil.cpu_count(logical=False),
            "Total Threads": psutil.cpu_count(logical=True),
            "CPU Usage": f"{psutil.cpu_percent(interval=1)}%",
            "Total RAM": f"{round(psutil.virtual_memory().total / (1024 ** 3), 2)} GB",
            "Available RAM": f"{round(psutil.virtual_memory().available / (1024 ** 3), 2)} GB",
            "Disk Space": {
                partition.mountpoint: {
                    "Total": f"{round(psutil.disk_usage(partition.mountpoint).total / (1024 ** 3), 2)} GB",
                    "Used": f"{round(psutil.disk_usage(partition.mountpoint).used / (1024 ** 3), 2)} GB",
                    "Free": f"{round(psutil.disk_usage(partition.mountpoint).free / (1024 ** 3), 2)} GB"
                }
                for partition in psutil.disk_partitions()
            },
            "Network": {
                "Hostname": socket.gethostname(),
                "IP Address": socket.gethostbyname(socket.gethostname()),
                "Interfaces": {
                    iface: {
                        "MAC Address": addrs[0].address if addrs else "N/A",
                        "Speed": f"{psutil.net_if_stats()[iface].speed} Mbps" if iface in psutil.net_if_stats() else "Unknown"
                    }
                    for iface, addrs in psutil.net_if_addrs().items()
                }
            }
        }
        return system_info

    except Exception as e:
        logger.error(f"Error fetching system info: {str(e)}")
        return {"error": "Could not retrieve system information."}
