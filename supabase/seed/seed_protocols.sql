-- Generated from data/achilles-protocols.seed.json by scripts/generate-seed-sql.ts.
-- Do not hand-edit; edit the JSON and regenerate instead.
-- No explicit begin/commit here: the migration runner already wraps this
-- in its own transaction.

-- Clear any previously seeded rows for these two protocols (their phases
-- cascade-delete) so this script is safe to re-run after a JSON edit.
delete from public.protocols where id in ('mgb-achilles-repair', 'willits-accelerated');

insert into public.protocols (id, name, source, applies_to, gating, global_notes, red_flags, supporting_programs, raw_json, is_verified, created_by)
values (
  'mgb-achilles-repair',
  'Mass General Brigham — Rehabilitation Protocol for Achilles Rupture Repair',
  'Massachusetts General Brigham Sports Medicine, revised 8/2021',
  ARRAY['surgical']::text[],
  'time_and_criterion',
  $jsonb$["Timeframes may vary by surgeon preference, additional procedures, or complications.","Take a more conservative approach for tendon augmentation, re-rupture after non-surgical management, revision, chronic tendinosis, and comorbidities (obesity, older age, steroid use).","Boot type, wedge use, and weaning schedule may vary by surgeon/practice."]$jsonb$::jsonb,
  $jsonb${"source":"protocol","action":"Advise the user to contact their referring physician / care team.","signs":["Fever","Unresolving numbness or tingling","Excessive drainage from the incision","Uncontrolled pain","Any other symptom of concern"]}$jsonb$::jsonb,
  $jsonb${"returnToRunning":{"prerequisite":"≥ 80% on the Functional Assessment before starting.","phase1":{"structure":"Warm-up walk 15 min, cool-down walk 10 min. Only progress if no pain or swelling during or after the run. Key: W = walk minutes, J = jog minutes, ×5 = repeat 5 times.","schedule":{"week1":["W5/J1 ×5","W5/J1 ×5","W4/J2 ×5","W4/J2 ×5"],"week2":["W3/J3 ×5","W3/J3 ×5","W2/J4 ×5"],"week3":["W2/J4 ×5","W1/J5 ×5","W1/J5 ×5","Return to Run"]}},"phase2":{"structure":"Warm-up walk 15 min, cool-down walk 10 min. Continuous-run minutes build over ~8 weeks.","schedule":{"week1":[20,20,20,25],"week2":[25,25,30],"week3":[30,30,35,35],"week4":[35,40,40],"week5":[40,45,45,45],"week6":[50,50,50],"week7":[55,55,55,60],"week8":[60,60]}},"recommendations":["Run on softer surfaces during Phase 1","Non-impact activity on off days","Increase mileage first, then pace — avoid increasing two variables at once","10% rule: no more than a 10% increase in mileage per week"]},"agilityPlyometric":{"prerequisite":"≥ 80% on the Functional Assessment before starting.","phase1_anterior":{"agility":["Forward run","Backward run","Forward lean-in to a run","Forward run with 3-step deceleration","Figure-8 run","Circle run","Ladder"],"plyometrics":["Shuttle press: double leg → alternating → single leg jumps","Double leg: box jumps on/off, forward jumps, forward-to-broad jump, tuck jumps, backward/forward hops over line/cone","Single leg (advanced): progressive single-leg jump tasks, bounding run, scissor jumps, backward/forward hops"],"criteriaToProgress":["No increase in pain/swelling","Pain-free during loading","Proper movement patterns"]},"phase2_lateral":{"agility":["Side shuffle","Carioca","Crossover steps","Shuttle run","Zig-zag run","Ladder"],"plyometrics":["Double leg: lateral jumps over line/cone, lateral tuck jumps over cone","Single leg (advanced): lateral jumps over line/cone, lateral jumps with sport cord"],"criteriaToProgress":["No increase in pain/swelling","Pain-free during loading","Proper movement patterns"]},"phase3_multiplanar":{"agility":["Box drill","Star drill","Side shuffle with hurdles"],"plyometrics":["Box jumps with quick change of direction","90° and 180° jumps"],"criteriaToProgress":["Clearance from MD","Functional assessment ≥ 90% contralateral","ATRS","PRRS"]}},"functionalAssessment":{"metrics":["Range of motion (X-0-X format)","Pain (0–10, average over past 2 weeks)","Standing Heel Rise test (single-leg raises on 10° incline box to 30 bpm metronome)","Single-leg Hop for Distance","Triple Hop for Distance","Crossover Hop for Distance","Vertical Jump","Y-Balance Test","Calculated 1RM (single-leg press)","Psychological Readiness to Return to Sport (PRRS)"],"output":"Limb Symmetry Index (operative vs. non-operative limb)"}}$jsonb$::jsonb,
  $jsonb${"id":"mgb-achilles-repair","name":"Mass General Brigham — Rehabilitation Protocol for Achilles Rupture Repair","source":"Massachusetts General Brigham Sports Medicine, revised 8/2021","appliesTo":["surgical"],"gating":"time_and_criterion","globalNotes":["Timeframes may vary by surgeon preference, additional procedures, or complications.","Take a more conservative approach for tendon augmentation, re-rupture after non-surgical management, revision, chronic tendinosis, and comorbidities (obesity, older age, steroid use).","Boot type, wedge use, and weaning schedule may vary by surgeon/practice."],"redFlags":{"source":"protocol","action":"Advise the user to contact their referring physician / care team.","signs":["Fever","Unresolving numbness or tingling","Excessive drainage from the incision","Uncontrolled pain","Any other symptom of concern"]},"phases":[{"orderIndex":0,"number":1,"name":"Immediate Post-Op","timeframeLabel":"0–3 weeks after surgery","timeframeStartDays":0,"timeframeEndDays":21,"goals":["Protect repair","Maintain strength of hip, knee, and core","Manage swelling"],"weightBearing":"Non-weight-bearing (NWB) on crutches in splint and/or Achilles boot.","assistiveDevices":["crutches","splint","Achilles boot"],"interventions":{"romMobility":["Supine passive hamstring stretch (in boot/splint)"],"strengthening":["Quad sets","Straight leg raise","Abdominal bracing","Hip abduction","Clamshell","Prone hip extension","Prone hamstring curls (all in boot/splint)"]},"criteriaToProgress":["Pain < 5/10"]},{"orderIndex":1,"number":2,"name":"Intermediate Post-Op","timeframeLabel":"4–6 weeks after surgery","timeframeStartDays":28,"timeframeEndDays":42,"goals":["Continue to protect repair","Avoid over-elongation of the Achilles","Reduce pain, minimize swelling","Improve scar mobility once incision is healed","Restore ankle plantar flexion, inversion, and eversion; dorsiflexion to neutral","Normalize gait in boot using a Shoe Leveler on the uninvolved side"],"weightBearing":["Week 4: Begin partial progressive weight-bearing on crutches in Achilles boot with 3 wedges (~1\" each). Progress ~25% body weight per week as tolerated until full weight-bearing without pain.","Week 5: Wean one heel wedge (2 wedges remaining).","Week 6: Wean second heel wedge (1 wedge remaining)."],"assistiveDevices":["crutches","Achilles boot","heel wedges (weaning: 3 → 2 → 1)","shoe leveler (uninvolved side)"],"continuesFromOrderIndexes":[0],"interventions":{"romMobility":["Initiate ankle PROM/AAROM/AROM — DO NOT dorsiflex past 0° (neutral)","Ankle pumps (no DF beyond neutral)","Ankle circles (no DF beyond neutral)","Ankle inversion","Ankle eversion","Seated heel-slides for DF ROM (not past 0°)","If stiff: great toe DF/PF stretching (do not exceed neutral DF at ankle)","Foot/ankle joint mobilizations per therapist discretion (avoid pressure on healing incision)","Gentle scar mobilization once incision healed — NO IASTM directly on tendon until at least 16 weeks post-op"],"cardio":["Upper body ergometer"],"strengthening":["Continue proximal lower-extremity strengthening (Phase I)","Lumbopelvic: planks (in Achilles boot)","Once able to sit with foot flat and ankle near neutral DF: seated heel raises, seated arch doming, foot intrinsic muscle exercises"],"proprioception":["Joint position re-training"]},"criteriaToProgress":["Pain < 3/10","Minimal swelling (e.g., Figure-8 or volumetric measure)","Full ROM plantar flexion, eversion, inversion","Dorsiflexion to neutral","Optimal gait in Achilles boot with 1 wedge, crutches, and Shoe Leveler"]},{"orderIndex":2,"number":3,"name":"Late Post-Op","timeframeLabel":"7–8 weeks after surgery","timeframeStartDays":49,"timeframeEndDays":56,"goals":["Continue to protect repair; no overt stretching of the Achilles","Normalize gait in Achilles boot without wedges using a Shoe Leveler","Restore full ROM including dorsiflexion","Safely progress strengthening; promote proper movement patterns","Avoid post-exercise pain/swelling","FWB in boot without wedges, without crutches, normalized gait by week 8"],"weightBearing":["Week 7: Remove final heel wedge. WBAT/FWB with one crutch or no crutches for normalized gait in boot without wedges; Shoe Leveler on uninvolved side (remove one layer).","Week 8: FWB in Achilles boot (no wedges) with Shoe Leveler on uninvolved side, without crutches."],"assistiveDevices":["crutches (weaning off by week 8)","Achilles boot (no wedges)","shoe leveler (uninvolved side, one layer removed)"],"continuesFromOrderIndexes":[0,1],"interventions":{"romMobility":["Continue seated heel-slides for DF (DF no longer restricted — progress gently)","Continue toe stretching as needed","Gentle stretching of proximal muscle groups (standing quad, standing hamstring, kneeling hip flexor, piriformis)","Ankle/foot mobilizations (talocrural, subtalar, midfoot, MTPs)","No overt calf stretching NWB or WB; calf towel stretch only if DF ROM progression is delayed"],"cardio":["Stationary bicycle (in Achilles boot)"],"strengthening":["4-way ankle with resistance band","Lumbopelvic: bridges on physioball, bridge with roll-in, alternating","Gym: hip abductor/adductor machine, hip extension machine, roman chair — progress intensity and duration"]},"criteriaToProgress":["No swelling/pain after exercise","Normal gait in boot without wedges or crutches","ROM equal to contralateral side","Joint position sense symmetrical (<5° margin of error)"]},{"orderIndex":3,"number":4,"name":"Transitional","timeframeLabel":"9–10 weeks after surgery","timeframeStartDays":63,"timeframeEndDays":70,"goals":["Maintain full ROM","Normalize gait in supportive sneaker with 1 cm heel lift","Avoid over-elongation of the Achilles","Safely progress strengthening; promote proper movement patterns","Avoid post-exercise pain/swelling"],"weightBearing":"Transition to supportive sneaker with 1 cm heel lift (FWB)","assistiveDevices":["supportive sneaker","1 cm heel lift"],"continuesFromOrderIndexes":[0,1,2],"interventions":{"romMobility":["Ankle/foot mobilizations as indicated","Continue seated heel-slides for DF; progress to standing ankle dorsiflexion stretch on a step"],"cardio":["Stationary bike","Flutter-kick swimming / pool jogging (only if incision fully healed)"],"strengthening":["Begin standing calf raise progression: bilateral 25% BW through involved → 50% equal → 75% BW through involved","Gym: seated hamstring curl machine, leg press machine"],"balanceProprioception":["Double-limb balance on uneven surface (wobble board)","Single-limb balance → uneven surface including perturbation training"]},"criteriaToProgress":["No swelling/pain after exercise","Normal gait in supportive sneaker with 1 cm heel lift"]},{"orderIndex":4,"number":5,"name":"Transitional","timeframeLabel":"11–12 weeks after surgery","timeframeStartDays":77,"timeframeEndDays":84,"goals":["Maintain full ROM","Normalize gait in supportive sneakers without heel lift","Avoid over-elongation of the Achilles","Safely progress strengthening; promote proper movement patterns","Avoid post-exercise pain/swelling"],"weightBearing":"Wean heel-lift from sneaker; normalize gait pattern","assistiveDevices":["supportive sneaker (heel-lift weaning)"],"continuesFromOrderIndexes":[0,1,2,3],"interventions":{"note":["Continue to progress ROM, cardio, strengthening, balance, and proprioception from previous phases as indicated"]},"criteriaToProgress":["No swelling/pain after exercise","Full ROM during standing bilateral concentric calf raise with equal weight-bearing","Normal gait in supportive sneakers"]},{"orderIndex":5,"number":6,"name":"Advanced Post-Op","timeframeLabel":"3–6 months after surgery","timeframeStartDays":91,"timeframeEndDays":182,"goals":["Safely progress strengthening; promote proper movement patterns","Avoid post-exercise pain/swelling; avoid over-elongation of the Achilles","Good tolerance with progression to plyometrics and agility training"],"continuesFromOrderIndexes":[1,2,3,4],"interventions":{"romMobility":["Continue standing ankle DF mobilization on step","May initiate gentle IASTM directly to the tendon beginning at 16 weeks"],"cardio":["Elliptical","Stair climber"],"strengthening":["If able to perform bilateral standing heel raises with 75% BW through full range of involved limb → progress to eccentric calf raises (bilateral raise, unilateral lowering on involved) on level surface → unilateral heel raises","Seated calf machine or wall sit with bilateral calf raises","Proximal control: hip hike; forward lunges (lead with injured leg first, then uninjured); lateral lunges; bilateral squat → single-leg progression (partial-WB single-leg press, slide-board lunges retro/lateral, step-ups, step-ups with march, lateral step-ups, step-downs, single-leg squats, single-leg wall slides)"],"plyometrics":["Beginner level. After 3×15 bilateral standing heel raises (equal WB) → rebounding heel raises bilateral stance","After 3×15 unilateral heel raises → rebounding unilateral heel raises","With good tolerance → hopping in place bilateral → progress to unilateral"]},"criteriaToProgress":["No swelling/pain after exercise","Standing Heel Rise test > 90% of uninvolved","No swelling/pain with 30 minutes of fast-paced walking","Good tolerance/performance of beginner-level plyometrics","Achilles Tendon Rupture Score (ATRS) collected","Psychological Readiness to Return to Sport (PRRS) collected"]},{"orderIndex":6,"number":7,"name":"Early to Unrestricted Return to Sport","timeframeLabel":"6+ months after surgery","timeframeStartDays":182,"timeframeEndDays":null,"goals":["Continue strengthening and proprioceptive exercises","Safely initiate sport-specific training program","Symmetrical performance with sport-specific drills","Safely progress to full sport"],"continuesFromOrderIndexes":[2,3,4,5],"interventions":{"romMobility":["May initiate gentle standing gastroc and soleus stretch as indicated at 6 months post-op"],"running":["Interval walk/jog program (Return to Running Phase 1)","Return to Running Program (Phase 2)"],"plyometricsAgility":["Progress to Agility & Plyometric Program once beginner plyos (Phase VI) and RTR Phase 1 completed with good tolerance"]},"criteriaToDischarge":["Clearance from MD AND all milestone criteria met","Completion of both phases of the Return to Running Program without pain/swelling","Functional assessment completed","Lower-extremity functional tests ≥ 90% vs. contralateral side for unilateral tests"]}],"supportingPrograms":{"returnToRunning":{"prerequisite":"≥ 80% on the Functional Assessment before starting.","phase1":{"structure":"Warm-up walk 15 min, cool-down walk 10 min. Only progress if no pain or swelling during or after the run. Key: W = walk minutes, J = jog minutes, ×5 = repeat 5 times.","schedule":{"week1":["W5/J1 ×5","W5/J1 ×5","W4/J2 ×5","W4/J2 ×5"],"week2":["W3/J3 ×5","W3/J3 ×5","W2/J4 ×5"],"week3":["W2/J4 ×5","W1/J5 ×5","W1/J5 ×5","Return to Run"]}},"phase2":{"structure":"Warm-up walk 15 min, cool-down walk 10 min. Continuous-run minutes build over ~8 weeks.","schedule":{"week1":[20,20,20,25],"week2":[25,25,30],"week3":[30,30,35,35],"week4":[35,40,40],"week5":[40,45,45,45],"week6":[50,50,50],"week7":[55,55,55,60],"week8":[60,60]}},"recommendations":["Run on softer surfaces during Phase 1","Non-impact activity on off days","Increase mileage first, then pace — avoid increasing two variables at once","10% rule: no more than a 10% increase in mileage per week"]},"agilityPlyometric":{"prerequisite":"≥ 80% on the Functional Assessment before starting.","phase1_anterior":{"agility":["Forward run","Backward run","Forward lean-in to a run","Forward run with 3-step deceleration","Figure-8 run","Circle run","Ladder"],"plyometrics":["Shuttle press: double leg → alternating → single leg jumps","Double leg: box jumps on/off, forward jumps, forward-to-broad jump, tuck jumps, backward/forward hops over line/cone","Single leg (advanced): progressive single-leg jump tasks, bounding run, scissor jumps, backward/forward hops"],"criteriaToProgress":["No increase in pain/swelling","Pain-free during loading","Proper movement patterns"]},"phase2_lateral":{"agility":["Side shuffle","Carioca","Crossover steps","Shuttle run","Zig-zag run","Ladder"],"plyometrics":["Double leg: lateral jumps over line/cone, lateral tuck jumps over cone","Single leg (advanced): lateral jumps over line/cone, lateral jumps with sport cord"],"criteriaToProgress":["No increase in pain/swelling","Pain-free during loading","Proper movement patterns"]},"phase3_multiplanar":{"agility":["Box drill","Star drill","Side shuffle with hurdles"],"plyometrics":["Box jumps with quick change of direction","90° and 180° jumps"],"criteriaToProgress":["Clearance from MD","Functional assessment ≥ 90% contralateral","ATRS","PRRS"]}},"functionalAssessment":{"metrics":["Range of motion (X-0-X format)","Pain (0–10, average over past 2 weeks)","Standing Heel Rise test (single-leg raises on 10° incline box to 30 bpm metronome)","Single-leg Hop for Distance","Triple Hop for Distance","Crossover Hop for Distance","Vertical Jump","Y-Balance Test","Calculated 1RM (single-leg press)","Psychological Readiness to Return to Sport (PRRS)"],"output":"Limb Symmetry Index (operative vs. non-operative limb)"}}}$jsonb$::jsonb,
  true,
  null
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'mgb-achilles-repair',
  0,
  1,
  'Immediate Post-Op',
  '0–3 weeks after surgery',
  0,
  21,
  $jsonb$["Protect repair","Maintain strength of hip, knee, and core","Manage swelling"]$jsonb$::jsonb,
  $jsonb$"Non-weight-bearing (NWB) on crutches in splint and/or Achilles boot."$jsonb$::jsonb,
  $jsonb${"romMobility":["Supine passive hamstring stretch (in boot/splint)"],"strengthening":["Quad sets","Straight leg raise","Abdominal bracing","Hip abduction","Clamshell","Prone hip extension","Prone hamstring curls (all in boot/splint)"]}$jsonb$::jsonb,
  $jsonb$["Pain < 5/10"]$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  null,
  $jsonb$["crutches","splint","Achilles boot"]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'mgb-achilles-repair',
  1,
  2,
  'Intermediate Post-Op',
  '4–6 weeks after surgery',
  28,
  42,
  $jsonb$["Continue to protect repair","Avoid over-elongation of the Achilles","Reduce pain, minimize swelling","Improve scar mobility once incision is healed","Restore ankle plantar flexion, inversion, and eversion; dorsiflexion to neutral","Normalize gait in boot using a Shoe Leveler on the uninvolved side"]$jsonb$::jsonb,
  $jsonb$["Week 4: Begin partial progressive weight-bearing on crutches in Achilles boot with 3 wedges (~1\" each). Progress ~25% body weight per week as tolerated until full weight-bearing without pain.","Week 5: Wean one heel wedge (2 wedges remaining).","Week 6: Wean second heel wedge (1 wedge remaining)."]$jsonb$::jsonb,
  $jsonb${"romMobility":["Initiate ankle PROM/AAROM/AROM — DO NOT dorsiflex past 0° (neutral)","Ankle pumps (no DF beyond neutral)","Ankle circles (no DF beyond neutral)","Ankle inversion","Ankle eversion","Seated heel-slides for DF ROM (not past 0°)","If stiff: great toe DF/PF stretching (do not exceed neutral DF at ankle)","Foot/ankle joint mobilizations per therapist discretion (avoid pressure on healing incision)","Gentle scar mobilization once incision healed — NO IASTM directly on tendon until at least 16 weeks post-op"],"cardio":["Upper body ergometer"],"strengthening":["Continue proximal lower-extremity strengthening (Phase I)","Lumbopelvic: planks (in Achilles boot)","Once able to sit with foot flat and ankle near neutral DF: seated heel raises, seated arch doming, foot intrinsic muscle exercises"],"proprioception":["Joint position re-training"]}$jsonb$::jsonb,
  $jsonb$["Pain < 3/10","Minimal swelling (e.g., Figure-8 or volumetric measure)","Full ROM plantar flexion, eversion, inversion","Dorsiflexion to neutral","Optimal gait in Achilles boot with 1 wedge, crutches, and Shoe Leveler"]$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  ARRAY[0]::int[],
  $jsonb$["crutches","Achilles boot","heel wedges (weaning: 3 → 2 → 1)","shoe leveler (uninvolved side)"]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'mgb-achilles-repair',
  2,
  3,
  'Late Post-Op',
  '7–8 weeks after surgery',
  49,
  56,
  $jsonb$["Continue to protect repair; no overt stretching of the Achilles","Normalize gait in Achilles boot without wedges using a Shoe Leveler","Restore full ROM including dorsiflexion","Safely progress strengthening; promote proper movement patterns","Avoid post-exercise pain/swelling","FWB in boot without wedges, without crutches, normalized gait by week 8"]$jsonb$::jsonb,
  $jsonb$["Week 7: Remove final heel wedge. WBAT/FWB with one crutch or no crutches for normalized gait in boot without wedges; Shoe Leveler on uninvolved side (remove one layer).","Week 8: FWB in Achilles boot (no wedges) with Shoe Leveler on uninvolved side, without crutches."]$jsonb$::jsonb,
  $jsonb${"romMobility":["Continue seated heel-slides for DF (DF no longer restricted — progress gently)","Continue toe stretching as needed","Gentle stretching of proximal muscle groups (standing quad, standing hamstring, kneeling hip flexor, piriformis)","Ankle/foot mobilizations (talocrural, subtalar, midfoot, MTPs)","No overt calf stretching NWB or WB; calf towel stretch only if DF ROM progression is delayed"],"cardio":["Stationary bicycle (in Achilles boot)"],"strengthening":["4-way ankle with resistance band","Lumbopelvic: bridges on physioball, bridge with roll-in, alternating","Gym: hip abductor/adductor machine, hip extension machine, roman chair — progress intensity and duration"]}$jsonb$::jsonb,
  $jsonb$["No swelling/pain after exercise","Normal gait in boot without wedges or crutches","ROM equal to contralateral side","Joint position sense symmetrical (<5° margin of error)"]$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  ARRAY[0, 1]::int[],
  $jsonb$["crutches (weaning off by week 8)","Achilles boot (no wedges)","shoe leveler (uninvolved side, one layer removed)"]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'mgb-achilles-repair',
  3,
  4,
  'Transitional',
  '9–10 weeks after surgery',
  63,
  70,
  $jsonb$["Maintain full ROM","Normalize gait in supportive sneaker with 1 cm heel lift","Avoid over-elongation of the Achilles","Safely progress strengthening; promote proper movement patterns","Avoid post-exercise pain/swelling"]$jsonb$::jsonb,
  $jsonb$"Transition to supportive sneaker with 1 cm heel lift (FWB)"$jsonb$::jsonb,
  $jsonb${"romMobility":["Ankle/foot mobilizations as indicated","Continue seated heel-slides for DF; progress to standing ankle dorsiflexion stretch on a step"],"cardio":["Stationary bike","Flutter-kick swimming / pool jogging (only if incision fully healed)"],"strengthening":["Begin standing calf raise progression: bilateral 25% BW through involved → 50% equal → 75% BW through involved","Gym: seated hamstring curl machine, leg press machine"],"balanceProprioception":["Double-limb balance on uneven surface (wobble board)","Single-limb balance → uneven surface including perturbation training"]}$jsonb$::jsonb,
  $jsonb$["No swelling/pain after exercise","Normal gait in supportive sneaker with 1 cm heel lift"]$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  ARRAY[0, 1, 2]::int[],
  $jsonb$["supportive sneaker","1 cm heel lift"]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'mgb-achilles-repair',
  4,
  5,
  'Transitional',
  '11–12 weeks after surgery',
  77,
  84,
  $jsonb$["Maintain full ROM","Normalize gait in supportive sneakers without heel lift","Avoid over-elongation of the Achilles","Safely progress strengthening; promote proper movement patterns","Avoid post-exercise pain/swelling"]$jsonb$::jsonb,
  $jsonb$"Wean heel-lift from sneaker; normalize gait pattern"$jsonb$::jsonb,
  $jsonb${"note":["Continue to progress ROM, cardio, strengthening, balance, and proprioception from previous phases as indicated"]}$jsonb$::jsonb,
  $jsonb$["No swelling/pain after exercise","Full ROM during standing bilateral concentric calf raise with equal weight-bearing","Normal gait in supportive sneakers"]$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  ARRAY[0, 1, 2, 3]::int[],
  $jsonb$["supportive sneaker (heel-lift weaning)"]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'mgb-achilles-repair',
  5,
  6,
  'Advanced Post-Op',
  '3–6 months after surgery',
  91,
  182,
  $jsonb$["Safely progress strengthening; promote proper movement patterns","Avoid post-exercise pain/swelling; avoid over-elongation of the Achilles","Good tolerance with progression to plyometrics and agility training"]$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  $jsonb${"romMobility":["Continue standing ankle DF mobilization on step","May initiate gentle IASTM directly to the tendon beginning at 16 weeks"],"cardio":["Elliptical","Stair climber"],"strengthening":["If able to perform bilateral standing heel raises with 75% BW through full range of involved limb → progress to eccentric calf raises (bilateral raise, unilateral lowering on involved) on level surface → unilateral heel raises","Seated calf machine or wall sit with bilateral calf raises","Proximal control: hip hike; forward lunges (lead with injured leg first, then uninjured); lateral lunges; bilateral squat → single-leg progression (partial-WB single-leg press, slide-board lunges retro/lateral, step-ups, step-ups with march, lateral step-ups, step-downs, single-leg squats, single-leg wall slides)"],"plyometrics":["Beginner level. After 3×15 bilateral standing heel raises (equal WB) → rebounding heel raises bilateral stance","After 3×15 unilateral heel raises → rebounding unilateral heel raises","With good tolerance → hopping in place bilateral → progress to unilateral"]}$jsonb$::jsonb,
  $jsonb$["No swelling/pain after exercise","Standing Heel Rise test > 90% of uninvolved","No swelling/pain with 30 minutes of fast-paced walking","Good tolerance/performance of beginner-level plyometrics","Achilles Tendon Rupture Score (ATRS) collected","Psychological Readiness to Return to Sport (PRRS) collected"]$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  ARRAY[1, 2, 3, 4]::int[],
  $jsonb$[]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'mgb-achilles-repair',
  6,
  7,
  'Early to Unrestricted Return to Sport',
  '6+ months after surgery',
  182,
  null,
  $jsonb$["Continue strengthening and proprioceptive exercises","Safely initiate sport-specific training program","Symmetrical performance with sport-specific drills","Safely progress to full sport"]$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  $jsonb${"romMobility":["May initiate gentle standing gastroc and soleus stretch as indicated at 6 months post-op"],"running":["Interval walk/jog program (Return to Running Phase 1)","Return to Running Program (Phase 2)"],"plyometricsAgility":["Progress to Agility & Plyometric Program once beginner plyos (Phase VI) and RTR Phase 1 completed with good tolerance"]}$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  $jsonb$["Clearance from MD AND all milestone criteria met","Completion of both phases of the Return to Running Program without pain/swelling","Functional assessment completed","Lower-extremity functional tests ≥ 90% vs. contralateral side for unilateral tests"]$jsonb$::jsonb,
  ARRAY[2, 3, 4, 5]::int[],
  $jsonb$[]$jsonb$::jsonb
);

insert into public.protocols (id, name, source, applies_to, gating, global_notes, red_flags, supporting_programs, raw_json, is_verified, created_by)
values (
  'willits-accelerated',
  'Willits — Achilles Tendon Rupture Accelerated Functional Rehabilitation Protocol',
  'Willits et al., eAppendix Table E-1',
  ARRAY['surgical', 'non_surgical']::text[],
  'time',
  $jsonb$["Same timeline applies to both groups; the 0–2 week entry differs: surgical group starts immediately post-op, non-operative group starts after injury.","Boot worn while sleeping. May remove boot for bathing/dressing but must adhere to weight-bearing restrictions."]$jsonb$::jsonb,
  $jsonb${"source":"achilla-baseline","action":"Advise the user to contact their referring physician / care team.","signs":["Fever","Uncontrolled pain","Excessive drainage from the incision","Unresolving numbness or tingling","Calf swelling, warmth, or redness (possible DVT)","A sudden \"pop\" or new gap/weakness (possible re-rupture)","Any other symptom of concern"],"note":"The Willits source table (a research-paper timeline, not a clinical handout) does not include red-flag guidance. This list is Achilla's general post-op safety baseline, not part of the Willits protocol itself."}$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  $jsonb${"id":"willits-accelerated","name":"Willits — Achilles Tendon Rupture Accelerated Functional Rehabilitation Protocol","source":"Willits et al., eAppendix Table E-1","appliesTo":["surgical","non_surgical"],"gating":"time","globalNotes":["Same timeline applies to both groups; the 0–2 week entry differs: surgical group starts immediately post-op, non-operative group starts after injury.","Boot worn while sleeping. May remove boot for bathing/dressing but must adhere to weight-bearing restrictions."],"redFlags":{"source":"achilla-baseline","action":"Advise the user to contact their referring physician / care team.","signs":["Fever","Uncontrolled pain","Excessive drainage from the incision","Unresolving numbness or tingling","Calf swelling, warmth, or redness (possible DVT)","A sudden \"pop\" or new gap/weakness (possible re-rupture)","Any other symptom of concern"],"note":"The Willits source table (a research-paper timeline, not a clinical handout) does not include red-flag guidance. This list is Achilla's general post-op safety baseline, not part of the Willits protocol itself."},"phases":[{"orderIndex":0,"number":null,"name":null,"timeframeLabel":"0–2 weeks","timeframeStartDays":0,"timeframeEndDays":14,"weightBearing":"Posterior slab/splint; non-weight-bearing with crutches (immediately post-op for surgical group; after injury for non-operative group).","assistiveDevices":["posterior slab/splint","crutches"],"interventions":{}},{"orderIndex":1,"number":null,"name":null,"timeframeLabel":"2–4 weeks","timeframeStartDays":14,"timeframeEndDays":28,"weightBearing":"Aircast walking boot with 2-cm heel lift. Protected weight-bearing with crutches.","assistiveDevices":["Aircast walking boot","2 cm heel lift","crutches"],"interventions":{"romMobility":["Active plantar flexion and dorsiflexion to neutral","Inversion/eversion below neutral"],"modalities":["Modalities to control swelling","Incision mobilization modalities"],"strengthening":["Knee/hip exercises with no ankle involvement (leg lifts from sitting, prone, or side-lying)"],"cardio":["Non-weight-bearing fitness/cardio: one-leg bicycling, deep-water running"],"other":["Hydrotherapy within motion and weight-bearing limits"]}},{"orderIndex":2,"number":null,"name":null,"timeframeLabel":"4–6 weeks","timeframeStartDays":28,"timeframeEndDays":42,"weightBearing":"Weight-bearing as tolerated (WBAT).","assistiveDevices":[],"continuesFromOrderIndexes":[1],"interventions":{"note":["Continue the 2–4 week protocol"]}},{"orderIndex":3,"number":null,"name":null,"timeframeLabel":"6–8 weeks","timeframeStartDays":42,"timeframeEndDays":56,"weightBearing":"Remove heel lift. Weight-bearing as tolerated.","assistiveDevices":[],"interventions":{"romMobility":["Dorsiflexion stretching, slowly"],"strengthening":["Graduated resistance exercises (open and closed kinetic chain, plus functional activities)"],"proprioception":["Proprioceptive and gait retraining"],"modalities":["Ice, heat, ultrasound as indicated","Incision mobilization"],"cardio":["Fitness/cardio including WBAT: bicycling, elliptical, treadmill walking/running, StairMaster"],"other":["Hydrotherapy"]}},{"orderIndex":4,"number":null,"name":null,"timeframeLabel":"8–12 weeks","timeframeStartDays":56,"timeframeEndDays":84,"weightBearing":"Wean off boot. Return to crutches and/or cane as necessary, then gradually wean off.","assistiveDevices":["crutches (weaning)","cane (weaning, as necessary)"],"interventions":{"note":["Continue to progress range of motion, strength, proprioception"]}},{"orderIndex":5,"number":null,"name":null,"timeframeLabel":">12 weeks","timeframeStartDays":84,"timeframeEndDays":null,"weightBearing":{"label":"Full weight-bearing.","inferred":true,"note":"Not stated verbatim in the source table for this row — inferred because crutches/cane are already being weaned off by the prior 8-12 week row. Distinct from the 4-6 and 6-8 week rows' 'weight-bearing as tolerated,' which is a different, partial-load term and should not be conflated with full weight-bearing."},"assistiveDevices":[],"interventions":{"progression":["Continue to progress ROM, strength, proprioception","Retrain strength, power, endurance","Increase dynamic weight-bearing exercise, include plyometric training","Sport-specific retraining"]}}]}$jsonb$::jsonb,
  true,
  null
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'willits-accelerated',
  0,
  null,
  null,
  '0–2 weeks',
  0,
  14,
  $jsonb$[]$jsonb$::jsonb,
  $jsonb$"Posterior slab/splint; non-weight-bearing with crutches (immediately post-op for surgical group; after injury for non-operative group)."$jsonb$::jsonb,
  $jsonb${}$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  null,
  $jsonb$["posterior slab/splint","crutches"]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'willits-accelerated',
  1,
  null,
  null,
  '2–4 weeks',
  14,
  28,
  $jsonb$[]$jsonb$::jsonb,
  $jsonb$"Aircast walking boot with 2-cm heel lift. Protected weight-bearing with crutches."$jsonb$::jsonb,
  $jsonb${"romMobility":["Active plantar flexion and dorsiflexion to neutral","Inversion/eversion below neutral"],"modalities":["Modalities to control swelling","Incision mobilization modalities"],"strengthening":["Knee/hip exercises with no ankle involvement (leg lifts from sitting, prone, or side-lying)"],"cardio":["Non-weight-bearing fitness/cardio: one-leg bicycling, deep-water running"],"other":["Hydrotherapy within motion and weight-bearing limits"]}$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  null,
  $jsonb$["Aircast walking boot","2 cm heel lift","crutches"]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'willits-accelerated',
  2,
  null,
  null,
  '4–6 weeks',
  28,
  42,
  $jsonb$[]$jsonb$::jsonb,
  $jsonb$"Weight-bearing as tolerated (WBAT)."$jsonb$::jsonb,
  $jsonb${"note":["Continue the 2–4 week protocol"]}$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  ARRAY[1]::int[],
  $jsonb$[]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'willits-accelerated',
  3,
  null,
  null,
  '6–8 weeks',
  42,
  56,
  $jsonb$[]$jsonb$::jsonb,
  $jsonb$"Remove heel lift. Weight-bearing as tolerated."$jsonb$::jsonb,
  $jsonb${"romMobility":["Dorsiflexion stretching, slowly"],"strengthening":["Graduated resistance exercises (open and closed kinetic chain, plus functional activities)"],"proprioception":["Proprioceptive and gait retraining"],"modalities":["Ice, heat, ultrasound as indicated","Incision mobilization"],"cardio":["Fitness/cardio including WBAT: bicycling, elliptical, treadmill walking/running, StairMaster"],"other":["Hydrotherapy"]}$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  null,
  $jsonb$[]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'willits-accelerated',
  4,
  null,
  null,
  '8–12 weeks',
  56,
  84,
  $jsonb$[]$jsonb$::jsonb,
  $jsonb$"Wean off boot. Return to crutches and/or cane as necessary, then gradually wean off."$jsonb$::jsonb,
  $jsonb${"note":["Continue to progress range of motion, strength, proprioception"]}$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  null,
  $jsonb$["crutches (weaning)","cane (weaning, as necessary)"]$jsonb$::jsonb
);

insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)
values (
  'willits-accelerated',
  5,
  null,
  null,
  '>12 weeks',
  84,
  null,
  $jsonb$[]$jsonb$::jsonb,
  $jsonb${"label":"Full weight-bearing.","inferred":true,"note":"Not stated verbatim in the source table for this row — inferred because crutches/cane are already being weaned off by the prior 8-12 week row. Distinct from the 4-6 and 6-8 week rows' 'weight-bearing as tolerated,' which is a different, partial-load term and should not be conflated with full weight-bearing."}$jsonb$::jsonb,
  $jsonb${"progression":["Continue to progress ROM, strength, proprioception","Retrain strength, power, endurance","Increase dynamic weight-bearing exercise, include plyometric training","Sport-specific retraining"]}$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  $jsonb$null$jsonb$::jsonb,
  null,
  $jsonb$[]$jsonb$::jsonb
);
