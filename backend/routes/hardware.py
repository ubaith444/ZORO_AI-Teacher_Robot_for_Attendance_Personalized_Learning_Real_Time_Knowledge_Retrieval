from fastapi import APIRouter, HTTPException
from backend.schemas import HardwareCommandRequest, HardwareStateResponse
from backend.hardware import robot_hardware
from backend.face_engine import FaceRecognitionEngine

router = APIRouter(prefix="/api/hardware", tags=["Raspberry Pi 5 & Motor Control"])
face_engine = FaceRecognitionEngine()

@router.get("/telemetry", response_model=HardwareStateResponse)
def get_hardware_telemetry():
    telemetry = robot_hardware.get_telemetry()
    return HardwareStateResponse(
        battery_level=telemetry["battery_level"],
        cpu_temp_celsius=telemetry["cpu_temp_celsius"],
        left_motor_speed=telemetry["left_motor_speed"],
        right_motor_speed=telemetry["right_motor_speed"],
        pan_angle=telemetry["pan_angle"],
        tilt_angle=telemetry["tilt_angle"],
        camera_active=telemetry["camera_active"],
        mic_active=telemetry["mic_active"],
        speaker_active=telemetry["speaker_active"],
        last_action=telemetry["last_action"],
        timestamp=telemetry["timestamp"]
    )

@router.post("/command")
def send_hardware_command(cmd: HardwareCommandRequest):
    action = cmd.action.lower()
    speed = max(0, min(100, cmd.speed))

    if action == "move_forward":
        robot_hardware.move_forward(speed)
    elif action == "move_backward":
        robot_hardware.move_backward(speed)
    elif action == "turn_left":
        robot_hardware.turn_left(speed)
    elif action == "turn_right":
        robot_hardware.turn_right(speed)
    elif action == "stop":
        robot_hardware.stop()
    elif action == "pan_tilt":
        pan = cmd.pan_angle if cmd.pan_angle is not None else robot_hardware.pan_angle
        tilt = cmd.tilt_angle if cmd.tilt_angle is not None else robot_hardware.tilt_angle
        robot_hardware.set_pan_tilt(pan, tilt)
    elif action == "reset":
        robot_hardware.stop()
        robot_hardware.set_pan_tilt(90, 90)
    else:
        raise HTTPException(status_code=400, detail=f"Unrecognized action: {cmd.action}")

    return {
        "status": "executed",
        "action": action,
        "telemetry": robot_hardware.get_telemetry()
    }

@router.get("/camera/snapshot")
def get_camera_snapshot():
    frame = robot_hardware.capture_frame()
    if frame is None:
        raise HTTPException(status_code=500, detail="Camera capture failed")

    # Detect faces in frame for overlay
    boxes = face_engine.detect_faces(frame)
    annotated = frame.copy()
    for (x, y, w, h) in boxes:
        import cv2
        cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 255, 120), 2)
        cv2.putText(annotated, "Face Detected", (x, max(20, y - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 120), 1)

    b64_img = face_engine.encode_image_base64(annotated)
    return {
        "image": b64_img,
        "face_count": len(boxes),
        "boxes": [{"x": x, "y": y, "w": w, "h": h} for (x, y, w, h) in boxes]
    }
