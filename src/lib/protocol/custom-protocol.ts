import { z } from "zod";

const interventionsRecordSchema = z.record(z.string().max(60), z.array(z.string().max(200)).max(40));

export const customPhaseInputSchema = z.object({
  name: z.string().max(120).nullable(),
  timeframeLabel: z.string().min(1).max(120),
  timeframeStartDays: z.number().int().min(0).max(2000).nullable(),
  timeframeEndDays: z.number().int().min(0).max(2000).nullable(),
  goals: z.array(z.string().max(200)).max(30),
  weightBearing: z.string().max(300).nullable(),
  gaitTraining: z.array(z.string().max(300)).max(20).nullable(),
  achillesInterventions: interventionsRecordSchema,
  restOfBodyInterventions: interventionsRecordSchema,
  criteriaToProgress: z.array(z.string().max(300)).max(20).nullable(),
});

export const confirmProtocolInputSchema = z.object({
  protocolName: z.string().min(1).max(200),
  appliesTo: z.array(z.enum(["surgical", "non_surgical"])).min(1),
  gating: z.enum(["time", "time_and_criterion"]),
  redFlagSigns: z.array(z.string().max(200)).max(20),
  phases: z.array(customPhaseInputSchema).min(1).max(15),
});

export type CustomPhaseInput = z.infer<typeof customPhaseInputSchema>;
export type ConfirmProtocolInput = z.infer<typeof confirmProtocolInputSchema>;
