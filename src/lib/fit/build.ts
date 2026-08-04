import { Encoder, Decoder, Stream, Profile } from "@garmin/fitsdk";
import type {
  FileIdMesg,
  EventMesg,
  RecordMesg,
  LapMesg,
  SessionMesg,
  ActivityMesg,
} from "@garmin/fitsdk";

export type FitActivityType = "running" | "generic_workout";

/**
 * Builds a minimal but valid FIT Activity file: file_id, start/stop timer
 * events, one record, a single lap, a session, and an activity message.
 * Running-phase days get sport "running" so Garmin Connect/Strava file them
 * as a run; everything else gets sport "training" (a generic workout) since
 * we only have duration/notes, not per-exercise data Garmin's catalog would
 * recognize.
 */
export function buildSessionFitFile({
  activityType,
  startTime,
  endTime,
}: {
  activityType: FitActivityType;
  startTime: Date;
  endTime: Date;
}): Uint8Array {
  const durationSeconds = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));
  const sport = activityType === "running" ? "running" : "training";
  const subSport = "generic";

  const encoder = new Encoder();

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.FILE_ID,
    type: "activity",
    manufacturer: "development",
    product: 0,
    timeCreated: startTime,
    serialNumber: 1,
  } as FileIdMesg & { mesgNum: number });

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.EVENT,
    timestamp: startTime,
    event: "timer",
    eventType: "start",
  } as EventMesg & { mesgNum: number });

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.RECORD,
    timestamp: startTime,
  } as RecordMesg & { mesgNum: number });

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.EVENT,
    timestamp: endTime,
    event: "timer",
    eventType: "stopAll",
  } as EventMesg & { mesgNum: number });

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.LAP,
    timestamp: endTime,
    startTime,
    totalElapsedTime: durationSeconds,
    totalTimerTime: durationSeconds,
    event: "lap",
    eventType: "stop",
    sport,
    subSport,
  } as LapMesg & { mesgNum: number });

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.SESSION,
    timestamp: endTime,
    startTime,
    totalElapsedTime: durationSeconds,
    totalTimerTime: durationSeconds,
    sport,
    subSport,
    firstLapIndex: 0,
    numLaps: 1,
    event: "session",
    eventType: "stop",
  } as SessionMesg & { mesgNum: number });

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.ACTIVITY,
    timestamp: endTime,
    numSessions: 1,
    type: "manual",
    event: "activity",
    eventType: "stop",
  } as ActivityMesg & { mesgNum: number });

  const bytes = encoder.close();

  // Never hand back (and never persist/serve) a file that doesn't
  // round-trip cleanly through the SDK's own decoder.
  const stream = Stream.fromByteArray(bytes);
  const decoder = new Decoder(stream);
  if (!decoder.isFIT() || !decoder.checkIntegrity()) {
    throw new Error("Generated FIT file failed isFIT/checkIntegrity validation.");
  }
  const { errors } = decoder.read();
  if (errors.length > 0) {
    throw new Error(`Generated FIT file failed round-trip decode: ${errors.join("; ")}`);
  }

  return bytes;
}
