import mss
import mss.tools
import numpy as np

class ScreenCapture:
    def __init__(self):
        self.sct = mss.mss()

    def capture_region(self, x, y, width, height):
        """
        Captures a specific region of the screen and returns a numpy array (BGR).
        """
        monitor = {"top": y, "left": x, "width": width, "height": height}
        
        # Grab the data
        sct_img = self.sct.grab(monitor)
        
        # Convert to numpy array
        # mss returns BGRA, we convert it to BGR for general use
        img = np.array(sct_img)
        # Drop the alpha channel
        return img[:, :, :3]

    def close(self):
        self.sct.close()

# Example usage:
# cap = ScreenCapture()
# img = cap.capture_region(0, 0, 800, 600)
# cap.close()
