from dataclasses import dataclass


@dataclass
class Camera:
    id: str
    name: str
    video_path: str
    description: str
    resolution: str  # e.g., "720p", "1080p"
    fps: int


DEMO_CAMERAS = [
    Camera(
        id="cam_001",
        name="Parking Lot",
        video_path="/app/demo_cameras/parking.mp4",
        description="Generic parking lot — tests vehicle detection (720p, 30fps, ~45sec)",
        resolution="720p",
        fps=30,
    ),
    Camera(
        id="cam_002",
        name="Street Intersection",
        video_path="/app/demo_cameras/street.mp4",
        description="Generic street footage — tests person detection (720p, 25fps, ~60sec)",
        resolution="720p",
        fps=25,
    ),
    Camera(
        id="cam_003",
        name="Building Entrance",
        video_path="/app/demo_cameras/building.mp4",
        description="Generic building entrance — tests mixed entity detection (720p, 30fps, ~50sec)",
        resolution="720p",
        fps=30,
    ),
]

REAL_CAMERAS = [
    Camera(
        id="real_sialar_parking_01",
        name="SIALAR Parking Lot (Real)",
        video_path="/app/real_cameras/parking_real.mp4",
        description="Real SIALAR parking lot surveillance footage — production data for Phase 5 integration testing",
        resolution="720p",
        fps=25,
    ),
]

# Combined list for API endpoints
ALL_CAMERAS = DEMO_CAMERAS + REAL_CAMERAS
