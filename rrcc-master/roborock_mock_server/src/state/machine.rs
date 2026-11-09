use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum RobotStateCode {
    Unknown = 0,
    Initiating = 1,
    Sleeping = 2,
    Waiting = 3,
    Cleaning = 5,
    Returning = 6,
    Remote = 7,
    Charging = 8,
    ChargeError = 9,
    Paused = 10,
    SpotClean = 11,
    Malfunctioning = 12,
    Updating = 14,
    RubToDock = 15,
    GotoTarget = 16,
    ZonedClean = 17,
    SegmentClean = 18,
    CollectingDust = 22,
    WashingDuster = 23,
    FullyCharged = 100,
    Offline = 101,
}

impl From<u8> for RobotStateCode {
    fn from(val: u8) -> Self {
        match val {
            1 => RobotStateCode::Initiating,
            2 => RobotStateCode::Sleeping,
            3 => RobotStateCode::Waiting,
            5 => RobotStateCode::Cleaning,
            6 => RobotStateCode::Returning,
            7 => RobotStateCode::Remote,
            8 => RobotStateCode::Charging,
            9 => RobotStateCode::ChargeError,
            10 => RobotStateCode::Paused,
            11 => RobotStateCode::SpotClean,
            12 => RobotStateCode::Malfunctioning,
            14 => RobotStateCode::Updating,
            15 => RobotStateCode::RubToDock,
            16 => RobotStateCode::GotoTarget,
            17 => RobotStateCode::ZonedClean,
            18 => RobotStateCode::SegmentClean,
            22 => RobotStateCode::CollectingDust,
            23 => RobotStateCode::WashingDuster,
            100 => RobotStateCode::FullyCharged,
            101 => RobotStateCode::Offline,
            _ => RobotStateCode::Unknown,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Consumables {
    pub main_brush_work_time: u32,
    pub side_brush_work_time: u32,
    pub filter_work_time: u32,
    pub sensor_dirty_time: u32,
}

impl Default for Consumables {
    fn default() -> Self {
        Self {
            main_brush_work_time: 36000, // 10 saat kullanılmış
            side_brush_work_time: 25000,
            filter_work_time: 18000,
            sensor_dirty_time: 7200,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RobotState {
    pub state_code: RobotStateCode,
    pub battery: u8,
    pub clean_time: u32,
    pub clean_area: u32, // cm² cinsinden veya Roborock mm²
    pub fan_power: u16,
    pub water_box_mode: u16,
    pub mop_mode: u16,
    pub error_code: u32,
    pub in_cleaning: u8,
    pub is_locating: u8,
    pub map_present: u8,
    pub dnd_enabled: u8,
    pub lock_status: u8,
    pub child_lock_status: u8,
    pub led_status: u8,
    pub carpet_clean_mode: u8,
    pub dust_collection_mode: u8,
    pub wash_towel_mode: u8,
    pub dryer_status: u8,
    pub dryer_duration: u32,
    pub consumables: Consumables,
    pub active_segments: Vec<u32>,
}

pub const VALID_SEGMENTS: [u32; 6] = [16, 17, 18, 19, 20, 21];

impl Default for RobotState {
    fn default() -> Self {
        Self {
            state_code: RobotStateCode::Charging,
            battery: 98,
            clean_time: 0,
            clean_area: 0,
            fan_power: 102,      // Dengeli
            water_box_mode: 202, // Orta
            mop_mode: 300,       // Standart
            error_code: 0,
            in_cleaning: 0,
            is_locating: 0,
            map_present: 1,
            dnd_enabled: 0,
            lock_status: 0,
            child_lock_status: 0,
            led_status: 1,
            carpet_clean_mode: 1,
            dust_collection_mode: 0,
            wash_towel_mode: 1,
            dryer_status: 0,
            dryer_duration: 7200,
            consumables: Consumables::default(),
            active_segments: Vec::new(),
        }
    }
}

impl RobotState {
    pub fn start_cleaning(&mut self) -> Result<(), &'static str> {
        self.state_code = RobotStateCode::Cleaning;
        self.in_cleaning = 1;
        Ok(())
    }

    pub fn start_segment_clean(&mut self, segments: &[u32]) -> Result<(), &'static str> {
        if segments.is_empty() || segments.iter().any(|s| !VALID_SEGMENTS.contains(s)) {
            return Err("invalid segment id");
        }
        self.active_segments = segments.to_vec();
        self.state_code = RobotStateCode::SegmentClean;
        self.in_cleaning = 1;
        Ok(())
    }

    pub fn start_zoned_clean(&mut self) -> Result<(), &'static str> {
        self.state_code = RobotStateCode::ZonedClean;
        self.in_cleaning = 1;
        Ok(())
    }

    pub fn start_spot_clean(&mut self) -> Result<(), &'static str> {
        self.state_code = RobotStateCode::SpotClean;
        self.in_cleaning = 1;
        Ok(())
    }

    pub fn pause_cleaning(&mut self) -> Result<(), &'static str> {
        self.state_code = RobotStateCode::Paused;
        Ok(())
    }

    pub fn resume_cleaning(&mut self) -> Result<(), &'static str> {
        self.state_code = RobotStateCode::Cleaning;
        self.in_cleaning = 1;
        Ok(())
    }

    pub fn resume_segment_clean(&mut self) -> Result<(), &'static str> {
        self.state_code = RobotStateCode::SegmentClean;
        self.in_cleaning = 1;
        Ok(())
    }

    pub fn resume_zoned_clean(&mut self) -> Result<(), &'static str> {
        self.state_code = RobotStateCode::ZonedClean;
        self.in_cleaning = 1;
        Ok(())
    }

    pub fn wakeup_robot(&mut self) -> Result<(), &'static str> {
        if self.state_code == RobotStateCode::Sleeping {
            self.state_code = RobotStateCode::Waiting;
        }
        Ok(())
    }

    pub fn stop_wash(&mut self) -> Result<(), &'static str> {
        if self.state_code == RobotStateCode::WashingDuster {
            self.state_code = RobotStateCode::Charging;
        }
        Ok(())
    }

    pub fn start_wash_then_charge(&mut self) -> Result<(), &'static str> {
        self.state_code = RobotStateCode::WashingDuster;
        self.in_cleaning = 0;
        Ok(())
    }

    pub fn stop_cleaning(&mut self) -> Result<(), &'static str> {
        self.state_code = RobotStateCode::Waiting;
        self.in_cleaning = 0;
        self.active_segments.clear();
        Ok(())
    }

    pub fn return_to_dock(&mut self) -> Result<(), &'static str> {
        self.state_code = RobotStateCode::Returning;
        self.in_cleaning = 0;
        Ok(())
    }

    pub fn reset_consumable(&mut self, name: &str) -> bool {
        match name {
            "main_brush_work_time" => {
                self.consumables.main_brush_work_time = 0;
                true
            }
            "side_brush_work_time" => {
                self.consumables.side_brush_work_time = 0;
                true
            }
            "filter_work_time" => {
                self.consumables.filter_work_time = 0;
                true
            }
            "sensor_dirty_time" => {
                self.consumables.sensor_dirty_time = 0;
                true
            }
            _ => false,
        }
    }
}
