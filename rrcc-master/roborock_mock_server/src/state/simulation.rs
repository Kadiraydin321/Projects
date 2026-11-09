use crate::state::machine::{RobotState, RobotStateCode};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

pub fn start_simulation_loop(state: Arc<RwLock<RobotState>>, sim_speed: f32) {
    let safe_speed = if sim_speed.is_finite() && sim_speed > 0.0 {
        sim_speed
    } else {
        1.0
    };
    let interval_ms = (1000.0 / safe_speed.max(0.1)) as u64;

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(interval_ms));
        let mut return_counter = 0;
        let mut charge_counter = 0;
        let mut dust_counter = 0;
        let mut wash_counter = 0;

        loop {
            interval.tick().await;

            let mut st = state.write().await;
            match st.state_code {
                RobotStateCode::Cleaning
                | RobotStateCode::SegmentClean
                | RobotStateCode::ZonedClean
                | RobotStateCode::SpotClean => {
                    st.clean_time += 1;
                    st.clean_area += 15; // 0.15 m²
                    st.consumables.main_brush_work_time += 1;
                    st.consumables.side_brush_work_time += 1;
                    st.consumables.filter_work_time += 1;
                    st.consumables.sensor_dirty_time += 1;

                    // Her 30 saniyede bir %1 batarya tüket
                    if st.clean_time % 30 == 0 && st.battery > 0 {
                        st.battery -= 1;
                    }

                    // Batarya kritik eşiğe (%15) düşerse şarja dön
                    if st.battery <= 15 {
                        st.state_code = RobotStateCode::Returning;
                        st.in_cleaning = 0;
                        return_counter = 0;
                    }
                }
                RobotStateCode::Returning | RobotStateCode::RubToDock => {
                    return_counter += 1;
                    // 5 tick sonra istasyona varır
                    if return_counter >= 5 {
                        st.state_code = RobotStateCode::Charging;
                        return_counter = 0;
                        charge_counter = 0;
                    }
                }
                RobotStateCode::Charging => {
                    charge_counter += 1;
                    // Her 4 tickte %1 batarya şarj olur
                    if charge_counter >= 4 {
                        charge_counter = 0;
                        if st.battery < 100 {
                            st.battery += 1;
                        }
                        if st.battery >= 100 {
                            st.state_code = RobotStateCode::FullyCharged;
                        }
                    }
                }
                RobotStateCode::CollectingDust => {
                    dust_counter += 1;
                    if dust_counter >= 4 {
                        st.state_code = RobotStateCode::Charging;
                        dust_counter = 0;
                    }
                }
                RobotStateCode::WashingDuster => {
                    wash_counter += 1;
                    if wash_counter >= 6 {
                        st.state_code = RobotStateCode::Charging;
                        wash_counter = 0;
                    }
                }
                _ => {}
            }
        }
    });
}
