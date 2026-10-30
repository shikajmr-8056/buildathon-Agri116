/**
 * useFirebase — Real-time Firebase hook for Prakruthi / QuantumGrow Smart Polyhouse
 *
 * Direct Hardware Integration with ESP32 Dual-Core Firmware:
 *   Endpoint: smart-polyhouse-dc97b-default-rtdb.asia-southeast1.firebasedatabase.app
 *
 * READS (ESP32 Master → Firebase RTDB → UI):
 *   sensors/temp1          number  DHT1 Temperature (°C) on GPIO 33
 *   sensors/temp2          number  DHT2 Temperature (°C) on GPIO 25
 *   sensors/hum1           number  DHT1 Relative Humidity (%) on GPIO 33
 *   sensors/hum2           number  DHT2 Relative Humidity (%) on GPIO 25
 *   sensors/ldr1           number  Light Sensor 1 (ADC 0–4095) on GPIO 36
 *   sensors/ldr2           number  Light Sensor 2 (ADC 0–4095) on GPIO 39
 *   sensors/soil1Percent   number  Soil Moisture Sensor 1 (0–100%) on GPIO 35
 *   sensors/soil2Wet       boolean Soil Sensor 2 Digital (true = WET, false = DRY) on GPIO 27
 *   sensors/mq2            number  MQ-2 Gas / Smoke Sensor on GPIO 34
 *   sensors/led12Percent   number  LED 1 & 2 Channel Brightness (0–100%) on GPIO 18, 19
 *   sensors/led34Percent   number  LED 3 & 4 Channel Brightness (0–100%) on GPIO 5, 4
 *   sensors/pwm1           number  Raw PWM (0–255) for LED 3 + LED 4
 *   sensors/pwm2           number  Raw PWM (0–255) for LED 1 + LED 2
 *   sensors/hoursLit       number  Cumulative hours lit tracker
 *   actuators/humidifier   boolean Humidifier Relay State (GPIO 23)
 *
 * WRITES (UI → Firebase RTDB → Hardware):
 *   controls/mode          "Auto" | "Manual"
 *   controls/ledOn         boolean
 *   controls/ledIntensity  number (0–100)
 *   controls/mistOn        boolean
 *   actuators/humidifier   boolean
 */

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

type Mode = "Auto" | "Manual";

export interface FirebaseState {
  // ── Dual & Primary Sensor Readings ────────────────────────────
  temp: number;
  temp1: number;
  temp2: number;

  humidity: number;
  hum1: number;
  hum2: number;

  lux: number;
  ldr1: number;
  ldr2: number;

  soilMoisture: number;
  soil1Percent: number;
  soil2Wet: boolean;
  soil1: number;
  soil2: number;

  mq2: number;

  ledBrightness: number;
  led12Percent: number;
  led34Percent: number;
  pwm1: number;
  pwm2: number;

  hoursLit: number;
  humidifierState: boolean;

  lightRaw: number;
  solarVoltage: number;
  lastUpdated: string | null;

  // ── Control state ─────────────────────────────────────────────
  mode: Mode;
  ledOn: boolean;
  ledIntensity: number;
  mistOn: boolean;

  // ── Status ────────────────────────────────────────────────────
  connected: boolean;   // true once real Firebase telemetry snapshot is received
  loading: boolean;     // true during initial connection phase

  // ── Write helpers ─────────────────────────────────────────────
  setMode: (mode: Mode) => Promise<void>;
  setLedOn: (on: boolean) => Promise<void>;
  setLedIntensity: (pct: number) => Promise<void>;
  setMistOn: (on: boolean) => Promise<void>;
}

/** Initial fallback state shown while first hardware packet is establishing */
const DEFAULTS = {
  temp: 29.6,
  temp1: 29.6,
  temp2: 0,
  humidity: 31,
  hum1: 31,
  hum2: 0,
  lux: 18500,
  ldr1: 694,
  ldr2: 2826,
  soilMoisture: 45,
  soil1Percent: 45,
  soil2Wet: true,
  soil1: 45,
  soil2: 1,
  mq2: 769,
  ledBrightness: 54,
  led12Percent: 21,
  led34Percent: 87,
  pwm1: 224,
  pwm2: 54,
  hoursLit: 0.05,
  humidifierState: true,
  lightRaw: 694,
  solarVoltage: 18.2,
  mode: "Auto" as Mode,
  ledOn: true,
  ledIntensity: 54,
  mistOn: true,
};

export function useFirebase(): FirebaseState {
  const [temp1, setTemp1] = useState(DEFAULTS.temp1);
  const [temp2, setTemp2] = useState(DEFAULTS.temp2);
  const [temp, setTemp] = useState(DEFAULTS.temp);

  const [hum1, setHum1] = useState(DEFAULTS.hum1);
  const [hum2, setHum2] = useState(DEFAULTS.hum2);
  const [humidity, setHumidity] = useState(DEFAULTS.humidity);

  const [ldr1, setLdr1] = useState(DEFAULTS.ldr1);
  const [ldr2, setLdr2] = useState(DEFAULTS.ldr2);
  const [lux, setLux] = useState(DEFAULTS.lux);

  const [soil1Percent, setSoil1Percent] = useState(DEFAULTS.soil1Percent);
  const [soil2Wet, setSoil2Wet] = useState(DEFAULTS.soil2Wet);
  const [soilMoisture, setSoilMoisture] = useState(DEFAULTS.soilMoisture);

  const [mq2, setMq2] = useState(DEFAULTS.mq2);

  const [led12Percent, setLed12Percent] = useState(DEFAULTS.led12Percent);
  const [led34Percent, setLed34Percent] = useState(DEFAULTS.led34Percent);
  const [ledBrightness, setLedBrightness] = useState(DEFAULTS.ledBrightness);
  const [pwm1, setPwm1] = useState(DEFAULTS.pwm1);
  const [pwm2, setPwm2] = useState(DEFAULTS.pwm2);

  const [hoursLit, setHoursLit] = useState(DEFAULTS.hoursLit);
  const [humidifierState, setHumidifierState] = useState(DEFAULTS.humidifierState);

  const [lightRaw, setLightRaw] = useState(DEFAULTS.lightRaw);
  const [solarVoltage, setSolarVoltage] = useState(DEFAULTS.solarVoltage);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [mode, setModeState] = useState<Mode>(DEFAULTS.mode);
  const [ledOn, setLedOnState] = useState(DEFAULTS.ledOn);
  const [ledIntensity, setLedIntensityState] = useState(DEFAULTS.ledIntensity);
  const [mistOn, setMistOnState] = useState(DEFAULTS.mistOn);

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Map LDR analog values (LDR_BRIGHT 300 to LDR_DARK 3500) to estimated canopy Lux
  function calculateLux(l1: number, l2: number): number {
    const minLdr = Math.min(l1 > 0 ? l1 : 3500, l2 > 0 ? l2 : 3500);
    // Darker = higher LDR ADC, Brighter = lower LDR ADC
    const fraction = Math.max(0, Math.min(1, (3500 - minLdr) / (3500 - 300)));
    return Math.round(200 + fraction * 62000);
  }

  function markTelemetricArrival() {
    setLoading(false);
    setConnected(true);
    setLastUpdated(
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }

  useEffect(() => {
    // ── Primary Hardware Sensors Node Listener ──────────────────────
    const sensorsRef = ref(db, "sensors");
    const unsubSensors = onValue(sensorsRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.val();
      if (!data || typeof data !== "object") return;

      // 1. Temperatures
      const t1 = typeof data.temp1 === "number" ? data.temp1 : typeof data.temperature === "number" ? data.temperature : null;
      const t2 = typeof data.temp2 === "number" ? data.temp2 : null;

      if (t1 !== null) setTemp1(t1);
      if (t2 !== null) setTemp2(t2);

      if (t1 !== null && t2 !== null && t2 > 0) {
        setTemp(+((t1 + t2) / 2).toFixed(1));
      } else if (t1 !== null) {
        setTemp(t1);
      }

      // 2. Humidity
      const h1 = typeof data.hum1 === "number" ? data.hum1 : typeof data.humidity === "number" ? data.humidity : null;
      const h2 = typeof data.hum2 === "number" ? data.hum2 : null;

      if (h1 !== null) setHum1(h1);
      if (h2 !== null) setHum2(h2);

      if (h1 !== null && h2 !== null && h2 > 0) {
        setHumidity(Math.round((h1 + h2) / 2));
      } else if (h1 !== null) {
        setHumidity(h1);
      }

      // 3. LDR & Light
      const l1 = typeof data.ldr1 === "number" ? data.ldr1 : typeof data.lightRaw === "number" ? data.lightRaw : null;
      const l2 = typeof data.ldr2 === "number" ? data.ldr2 : null;

      if (l1 !== null) {
        setLdr1(l1);
        setLightRaw(l1);
      }
      if (l2 !== null) setLdr2(l2);

      if (typeof data.lux === "number") {
        setLux(data.lux);
      } else if (l1 !== null || l2 !== null) {
        setLux(calculateLux(l1 ?? 2000, l2 ?? 2000));
      }

      // 4. Soil Moisture
      const s1 = typeof data.soil1Percent === "number" ? data.soil1Percent : typeof data.soilMoisture === "number" ? data.soilMoisture : null;
      const s2Wet = typeof data.soil2Wet === "boolean" ? data.soil2Wet : typeof data.soil2Wet === "string" ? data.soil2Wet === "true" || data.soil2Wet === "WET" : null;

      if (s1 !== null) {
        setSoil1Percent(s1);
        setSoilMoisture(s1);
      }
      if (s2Wet !== null) setSoil2Wet(s2Wet);

      // 5. MQ-2 Gas Sensor
      if (typeof data.mq2 === "number") setMq2(data.mq2);

      // 6. LED Brightness & PWMs
      const l12 = typeof data.led12Percent === "number" ? data.led12Percent : null;
      const l34 = typeof data.led34Percent === "number" ? data.led34Percent : null;
      if (l12 !== null) setLed12Percent(l12);
      if (l34 !== null) setLed34Percent(l34);

      if (l12 !== null && l34 !== null) {
        const avgBri = Math.round((l12 + l34) / 2);
        setLedBrightness(avgBri);
        setLedIntensityState(avgBri);
        setLedOnState(avgBri > 0);
      } else if (typeof data.ledBrightness === "number") {
        setLedBrightness(data.ledBrightness);
        setLedIntensityState(data.ledBrightness);
        setLedOnState(data.ledBrightness > 0);
      }

      if (typeof data.pwm1 === "number") setPwm1(data.pwm1);
      if (typeof data.pwm2 === "number") setPwm2(data.pwm2);

      // 7. Cumulative Hours Lit
      if (typeof data.hoursLit === "number") setHoursLit(+data.hoursLit.toFixed(3));

      // 8. Solar voltage if measured
      if (typeof data.solarVoltage === "number") setSolarVoltage(data.solarVoltage);

      markTelemetricArrival();
    });

    // ── Actuators Node Listener (Humidifier / Mist) ─────────────────
    const actuatorsRef = ref(db, "actuators");
    const unsubActuators = onValue(actuatorsRef, (snap) => {
      if (!snap.exists()) return;
      const act = snap.val();
      if (!act || typeof act !== "object") return;

      if (typeof act.humidifier === "boolean") {
        setHumidifierState(act.humidifier);
        setMistOnState(act.humidifier);
      }
      markTelemetricArrival();
    });

    // ── Controls Node Listener (User overrides sync) ────────────────
    const controlsRef = ref(db, "controls");
    const unsubControls = onValue(controlsRef, (snap) => {
      if (!snap.exists()) return;
      const ctrl = snap.val();
      if (!ctrl || typeof ctrl !== "object") return;

      if (ctrl.mode === "Auto" || ctrl.mode === "Manual") setModeState(ctrl.mode);
      if (typeof ctrl.ledOn === "boolean") setLedOnState(ctrl.ledOn);
      if (typeof ctrl.ledIntensity === "number") setLedIntensityState(ctrl.ledIntensity);
      if (typeof ctrl.mistOn === "boolean") {
        setMistOnState(ctrl.mistOn);
        setHumidifierState(ctrl.mistOn);
      }
      markTelemetricArrival();
    });

    return () => {
      unsubSensors();
      unsubActuators();
      unsubControls();
    };
  }, []);

  // ── Write helpers with optimistic local state ─────────────────────
  async function writeControl<T>(path: string, value: T) {
    try {
      await set(ref(db, path), value);
    } catch (err) {
      console.error(`Firebase write failed [${path}]:`, err);
      toast.error("Could not sync with Firebase. Check network credentials.");
      throw err;
    }
  }

  const setMode = async (m: Mode) => {
    const prev = mode;
    setModeState(m);
    try {
      await writeControl("controls/mode", m);
      toast.success(`Operating mode updated to ${m}`);
    } catch {
      setModeState(prev);
    }
  };

  const setLedOn = async (on: boolean) => {
    const prev = ledOn;
    setLedOnState(on);
    try {
      await writeControl("controls/ledOn", on);
      if (!on) {
        setLedIntensityState(0);
        await writeControl("controls/ledIntensity", 0);
      } else {
        const defaultInt = ledIntensity > 0 ? ledIntensity : 60;
        setLedIntensityState(defaultInt);
        await writeControl("controls/ledIntensity", defaultInt);
      }
      toast.success(on ? "Grow lights turned ON" : "Grow lights turned OFF");
    } catch {
      setLedOnState(prev);
    }
  };

  const setLedIntensity = async (pct: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(pct)));
    const prevInt = ledIntensity;
    const prevOn = ledOn;

    setLedIntensityState(clamped);
    setLedOnState(clamped > 0);

    try {
      await writeControl("controls/ledIntensity", clamped);
      await writeControl("controls/ledOn", clamped > 0);
    } catch {
      setLedIntensityState(prevInt);
      setLedOnState(prevOn);
    }
  };

  const setMistOn = async (on: boolean) => {
    const prev = mistOn;
    setMistOnState(on);
    setHumidifierState(on);
    try {
      await writeControl("controls/mistOn", on);
      await writeControl("actuators/humidifier", on);
      toast.success(on ? "Humidifier / misting ACTIVATED" : "Humidifier / misting STOPPED");
    } catch {
      setMistOnState(prev);
      setHumidifierState(prev);
    }
  };

  return {
    temp,
    temp1,
    temp2,
    humidity,
    hum1,
    hum2,
    lux,
    ldr1,
    ldr2,
    soilMoisture,
    soil1Percent,
    soil2Wet,
    soil1: soil1Percent,
    soil2: soil2Wet ? 85 : 15,
    mq2,
    ledBrightness,
    led12Percent,
    led34Percent,
    pwm1,
    pwm2,
    hoursLit,
    humidifierState,
    lightRaw,
    solarVoltage,
    lastUpdated,
    mode,
    ledOn,
    ledIntensity,
    mistOn,
    connected,
    loading,
    setMode,
    setLedOn,
    setLedIntensity,
    setMistOn,
  };
}
