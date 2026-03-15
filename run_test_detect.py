import asyncio
from fastapi import UploadFile
from backend.main import detect

async def run_test():
    with open('test_video.mp4', 'rb') as f:
        file = UploadFile(file=f, filename='test_video.mp4')
        try:
            res = await detect(None, file, 'Test')
            print(res)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(run_test())
