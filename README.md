# AR Display Simulator v3

This build fixes the previous UX issue by adding an explicit START AR button and a visible engine-loading state.

It uses the 8th Wall Engine Distributed Binary from jsDelivr, Three.js, and 8th Wall World Tracking (SLAM). The official documentation shows this engine can be loaded with the jsDelivr script tag, and World Tracking uses `XR8.XrController.pipelineModule()` plus `XR8.run()` on a camera canvas.

Features:
- Explicit START AR
- iPhone Safari back-camera AR
- World tracking / SLAM
- Absolute-scale meters
- Air placement
- mm / diagonal inch units
- 21.5 / 23 / 24 / 27 / 32 / 43 / 55 / 65 / 75 inch presets
- 16:9 / 3:4 / 3:2
- 18% gray display
- 5 mm / no bezel
- Size ON/OFF
- Delete selected
- Sequential # numbering after deletion
- Local save/load
- AR screenshot

IMPORTANT:
GitHub Pages may cache the previous deployment. After replacing the files, open the URL with a cache-busting query such as `?v=3`, or use Safari's reload after clearing the site data.

AR requires HTTPS and a supported browser. iOS Safari 16.4+ is documented as supported by 8th Wall.
