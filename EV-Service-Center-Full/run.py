import os
import subprocess

def run_service(name, port):
    print(f"🚀 Starting {name} on port {port} ...")
    subprocess.Popen(["uvicorn", f"services.{name}.app:app", "--reload", "--port", str(port)])

if __name__ == "__main__":
    services = {
        "user-service": 5000,
        "listing-service": 5001
    }

    for name, port in services.items():
        run_service(name, port)

    print("\n✅ All services are starting...")
    print("Use Ctrl+C to stop.")
    try:
        while True:
            pass
    except KeyboardInterrupt:
        print("\n🛑 Stopped.")
