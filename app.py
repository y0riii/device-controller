import os
import webbrowser
import time

os.system("start cmd /k peerjs --port 3001")
os.system("start cmd /k node server")
time.sleep(2)
webbrowser.open_new("http://localhost:4000")
