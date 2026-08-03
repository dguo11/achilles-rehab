// Placeholder until Phase 1 generates real types from the Supabase schema via
// `supabase gen types typescript`. Using `any` here (not a narrower type) is
// intentional: the Supabase client's generic constraints require a shape we
// can't approximate safely before the schema exists.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
