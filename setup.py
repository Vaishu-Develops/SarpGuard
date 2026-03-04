import os
import shutil
import subprocess

try:
    print("Running npx create-vite temp-react --template react")
    subprocess.run(["npx.cmd", "create-vite", "temp-react", "--template", "react"], check=True, shell=True)
    
    src = "temp-react"
    dst = "frontend"
    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(dst, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
            
    shutil.rmtree(src)
    print("Done copying")
    
    print("Installing deps with pnpm")
    # subprocess.run(["npx.cmd", "pnpm", "install"], cwd="frontend", check=True, shell=True)
except Exception as e:
    print("Error:", e)
