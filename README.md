# AR Display Simulator v2

This version replaces the screen-space camera overlay with 8th Wall World Tracking (SLAM) and Three.js.

Features:
- iPhone Safari back-camera AR
- Absolute-scale world coordinates
- Air placement about 2 m in front of the camera
- mm input
- Conventional diagonal-inch input
- 21.5 / 23 / 24 / 27 / 32 / 43 / 55 / 65 / 75 inch presets
- 16:9 / 3:4 / 3:2
- 18% gray screen
- 5 mm bezel / none
- Size display on/off
- Delete selected display
- Sequential display numbering that compacts after deletion
- Local save/load
- AR screenshot
- Recenter

Deployment:
Upload `index.html` and `src/` to the root of a public GitHub repository and enable GitHub Pages from `main` / `root`. No build step is required.

AR requires HTTPS. 8th Wall documents iOS Safari 16.4+ as supported and requires camera access, device orientation, WebGL and WebAssembly SIMD.

The 8th Wall hosted platform was retired in February 2026. The XR Engine is now distributed for self-hosted use. SLAM is provided through the distributed engine binary. The required Niantic Spatial attribution is included in `index.html`.

Current interaction: tap an existing display to select it, then drag it in 3D at approximately its current depth. New displays are placed in mid-air rather than forced onto the floor.

The next logical additions are two-finger rotation, numeric XYZ/rotation controls, floor/wall placement modes, plan/side views, JSON import/export, and image/video/webpage content.
