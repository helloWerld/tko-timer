import type { Exercise } from "./types";

/**
 * Starter exercise library. Every entry is bodyweight / minimal-equipment so a
 * workout can be run anywhere. Edit freely — the generator just filters by
 * `goals` and `difficulty`.
 */
export const EXERCISES: Exercise[] = [
  // ---- Full body ----
  { id: "jumping-jacks", name: "Jumping Jacks", goals: ["full", "cardio"], difficulty: "beginner", cue: "Big arms, light feet", description: "Stand tall, then jump your feet out wide while sweeping your arms overhead. Jump back to the start and repeat at a steady, springy pace." },
  { id: "burpees", name: "Burpees", goals: ["full", "cardio"], difficulty: "advanced", cue: "Chest to floor, jump tall", description: "From standing, squat and place your hands on the floor. Jump your feet back to a plank, lower your chest down, push back up, then jump your feet in and explode straight up with arms overhead." },
  { id: "half-burpees", name: "Half Burpees", goals: ["full", "cardio"], difficulty: "intermediate", cue: "Plank, jump in, stand", description: "Place your hands on the floor and jump both feet back into a plank, then immediately jump them back in toward your hands and stand tall. No push-up or jump — keep it flowing." },
  { id: "bear-crawl", name: "Bear Crawl", goals: ["full", "core"], difficulty: "intermediate", cue: "Knees hover, flat back", description: "Start on hands and knees with knees hovering an inch off the floor. Crawl forward and back moving opposite hand and foot together, keeping your back flat and hips low." },
  { id: "inchworm", name: "Inchworm", goals: ["full", "core"], difficulty: "beginner", cue: "Walk hands out and back", description: "From standing, hinge and walk your hands forward into a plank. Pause, then walk your hands back to your feet and stand up. Keep your legs as straight as is comfortable." },
  { id: "thrusters", name: "Thrusters", goals: ["full", "lower"], difficulty: "advanced", cue: "Squat then press overhead", description: "Hold your hands at your shoulders and squat down. As you stand, drive up through your legs and press both arms straight overhead in one smooth motion." },
  { id: "star-jumps", name: "Star Jumps", goals: ["full", "cardio"], difficulty: "intermediate", cue: "Explode wide, land soft", description: "Sink into a quarter squat, then explode up, spreading your arms and legs wide into a star shape in the air. Land softly with bent knees and repeat." },
  { id: "crab-walk", name: "Crab Walk", goals: ["full", "core"], difficulty: "beginner", cue: "Hips lifted, walk hand and foot", description: "Sit with knees bent and hands behind you, then lift your hips off the floor. Walk forward and back moving opposite hand and foot, keeping your hips up the whole time." },
  { id: "plank-jacks", name: "Plank Jacks", goals: ["full", "core", "cardio"], difficulty: "intermediate", cue: "Plank, jump feet wide and in", description: "Hold a plank on your hands or forearms. Jump both feet out wide and then back together — like a horizontal jumping jack — keeping your hips steady and core tight." },
  { id: "inchworm-pushup", name: "Inchworm Push-Up", goals: ["full", "upper", "core"], difficulty: "intermediate", cue: "Walk out, one push-up, back", description: "Walk your hands out from your feet into a plank, perform one push-up, then walk your hands back and stand up. Repeat for the interval." },
  { id: "burpee-broad-jump", name: "Burpee Broad Jump", goals: ["full", "cardio"], difficulty: "advanced", cue: "Burpee, then leap forward", description: "Do a full burpee, but instead of jumping straight up, leap forward as far as you can. Land softly with bent knees, reset or turn around, and repeat." },

  // ---- Upper body ----
  { id: "pushups", name: "Push-Ups", goals: ["upper", "full"], difficulty: "intermediate", cue: "Elbows 45°, brace core", description: "Start in a high plank with hands a little wider than your shoulders. Keeping a straight line from head to heels, lower your chest toward the floor with elbows about 45°, then press back up." },
  { id: "knee-pushups", name: "Knee Push-Ups", goals: ["upper"], difficulty: "beginner", cue: "Straight line knees to head", description: "Perform a push-up from your knees instead of your toes. Keep a straight line from knees to head and lower your chest under control before pressing up." },
  { id: "diamond-pushups", name: "Diamond Push-Ups", goals: ["upper"], difficulty: "advanced", cue: "Hands together, triceps drive", description: "Make a diamond shape with your thumbs and index fingers under your chest. Lower down keeping your elbows close to your body to load the triceps, then press up." },
  { id: "pike-pushups", name: "Pike Push-Ups", goals: ["upper"], difficulty: "advanced", cue: "Hips high, crown to floor", description: "From a downward-dog shape with hips high, bend your elbows to lower the crown of your head toward the floor, then press back up. Targets the shoulders." },
  { id: "shoulder-taps", name: "Shoulder Taps", goals: ["upper", "core"], difficulty: "beginner", cue: "Steady plank, no hip sway", description: "Hold a high plank with feet about hip-width. Tap one hand to the opposite shoulder, then switch, keeping your hips as still as possible — no rocking." },
  { id: "tricep-dips", name: "Tricep Dips", goals: ["upper"], difficulty: "intermediate", cue: "Elbows back, chest proud", description: "Sit on the edge of a chair or step gripping the edge. Slide your hips off and bend your elbows straight back to lower down, then press back up. Keep your chest tall." },
  { id: "arm-circles", name: "Arm Circles", goals: ["upper"], difficulty: "beginner", cue: "Small fast circles, both ways", description: "Extend your arms out to the sides at shoulder height and draw small, fast circles. Switch directions halfway through the interval." },
  { id: "plank-up-down", name: "Plank Up-Downs", goals: ["upper", "core"], difficulty: "intermediate", cue: "Forearm to hand, lead each side", description: "From a forearm plank, press up onto one hand at a time into a high plank, then lower back to your forearms one arm at a time. Alternate which arm leads." },
  { id: "incline-pushups", name: "Incline Push-Ups", goals: ["upper"], difficulty: "beginner", cue: "Hands raised, chest leads", description: "Place your hands on a raised surface like a bench, step, or counter. Perform a push-up at this easier angle, keeping your body in a straight line." },
  { id: "superman-pulls", name: "Superman Pulls", goals: ["upper", "core"], difficulty: "beginner", cue: "Prone, pull elbows to ribs", description: "Lie face-down with arms reaching forward. Lift your chest and arms, then pull your elbows back toward your ribs like a row, squeezing your upper back. Reach forward and repeat." },
  { id: "wide-pushups", name: "Wide Push-Ups", goals: ["upper"], difficulty: "intermediate", cue: "Hands wide, lower with control", description: "Perform a push-up with your hands set wider than usual. Lower with control to emphasize the chest, then press back up." },
  { id: "hand-release-pushups", name: "Hand-Release Push-Ups", goals: ["upper"], difficulty: "intermediate", cue: "Lift hands at the bottom", description: "Lower all the way to the floor, lift your hands off the ground for a moment, then place them back down and press up. Resets every rep from a dead stop." },
  { id: "decline-pushups", name: "Decline Push-Ups", goals: ["upper"], difficulty: "advanced", cue: "Feet elevated, crown toward floor", description: "Place your feet on a raised surface and your hands on the floor. Perform a push-up in this declined position to shift more load onto the shoulders and upper chest." },
  { id: "pseudo-planche-pushups", name: "Pseudo Planche Push-Ups", goals: ["upper"], difficulty: "advanced", cue: "Hands by hips, lean forward", description: "In a push-up position, place your hands down by your hips with fingers pointing back, and lean your shoulders forward over your hands. Perform small push-ups in this leaned position." },
  { id: "wall-walks", name: "Wall Walks", goals: ["upper", "core"], difficulty: "advanced", cue: "Walk feet up, hands toward wall", description: "Start in a plank with your feet against a wall. Walk your feet up the wall while walking your hands toward it, climbing toward a handstand, then reverse back down." },

  // ---- Lower body ----
  { id: "air-squats", name: "Air Squats", goals: ["lower", "full"], difficulty: "beginner", cue: "Sit back, chest up", description: "Stand with feet shoulder-width. Push your hips back and bend your knees to lower until your thighs are about parallel to the floor, keeping your chest up, then stand." },
  { id: "jump-squats", name: "Jump Squats", goals: ["lower", "cardio"], difficulty: "advanced", cue: "Land soft, sink and explode", description: "Lower into a squat, then explode straight up off the floor. Land softly with bent knees and immediately sink into the next rep." },
  { id: "lunges", name: "Alternating Lunges", goals: ["lower"], difficulty: "beginner", cue: "Knee tracks over toe", description: "Step forward and lower until both knees are bent about 90°, front knee over your ankle. Push back to standing and alternate legs." },
  { id: "reverse-lunges", name: "Reverse Lunges", goals: ["lower"], difficulty: "intermediate", cue: "Step back, drop straight down", description: "Step one foot back and lower straight down until both knees are bent 90°. Drive through your front heel to stand, then alternate. Easier on the knees than forward lunges." },
  { id: "jump-lunges", name: "Jump Lunges", goals: ["lower", "cardio"], difficulty: "advanced", cue: "Switch legs midair", description: "From a lunge, jump up and switch your legs in the air, landing in a lunge on the other side. Keep your chest tall and land softly." },
  { id: "glute-bridge", name: "Glute Bridges", goals: ["lower", "core"], difficulty: "beginner", cue: "Squeeze glutes at the top", description: "Lie on your back with knees bent and feet flat. Drive through your heels to lift your hips into a straight line, squeeze your glutes at the top, then lower." },
  { id: "single-leg-bridge", name: "Single-Leg Bridges", goals: ["lower", "core"], difficulty: "intermediate", cue: "Hips level, one foot up", description: "Set up for a glute bridge but extend one leg straight. Lift your hips using the planted leg, keeping your pelvis level, then lower. Switch sides halfway." },
  { id: "wall-sit", name: "Wall Sit", goals: ["lower"], difficulty: "intermediate", cue: "Thighs parallel, breathe", description: "Lean your back flat against a wall and slide down until your thighs are parallel to the floor, knees over ankles. Hold the position and keep breathing." },
  { id: "calf-raises", name: "Calf Raises", goals: ["lower"], difficulty: "beginner", cue: "Full height, slow lower", description: "Stand tall and slowly rise onto the balls of your feet as high as you can. Pause at the top, then lower your heels under control." },
  { id: "curtsy-lunge", name: "Curtsy Lunges", goals: ["lower"], difficulty: "intermediate", cue: "Cross behind, hips square", description: "Step one foot diagonally behind the other like a curtsy and lower until both knees are bent. Return to standing and alternate sides, keeping your hips square." },
  { id: "squat-pulse", name: "Squat Pulses", goals: ["lower"], difficulty: "intermediate", cue: "Stay low, small pulses", description: "Lower into a squat and stay low, pulsing up and down a few inches without standing all the way up. Keeps constant tension on the legs." },
  { id: "sumo-squats", name: "Sumo Squats", goals: ["lower"], difficulty: "beginner", cue: "Wide stance, toes out, sit tall", description: "Take a wide stance with toes turned out. Lower straight down keeping your chest tall and knees tracking over your toes, then stand and squeeze your glutes." },
  { id: "donkey-kicks", name: "Donkey Kicks", goals: ["lower"], difficulty: "beginner", cue: "Drive heel up, hips square", description: "On hands and knees, keep one knee bent and drive that heel toward the ceiling until your thigh is in line with your body. Lower without touching down, then switch sides." },
  { id: "fire-hydrants", name: "Fire Hydrants", goals: ["lower"], difficulty: "beginner", cue: "Knee out to the side, hips still", description: "On hands and knees, lift one bent knee out to the side while keeping your hips level. Lower and repeat, then switch sides." },
  { id: "good-mornings", name: "Good Mornings", goals: ["lower", "core"], difficulty: "beginner", cue: "Hinge at hips, soft knees", description: "Stand with hands at your chest or behind your head and soft knees. Hinge at your hips, pushing them back to lower your chest with a flat back, then return to standing." },
  { id: "lateral-lunges", name: "Lateral Lunges", goals: ["lower"], difficulty: "intermediate", cue: "Step wide, sit into one hip", description: "Step out wide to one side and sit your hips back into that leg while the other stays straight. Push back to center and alternate sides." },
  { id: "single-leg-deadlift", name: "Single-Leg Deadlifts", goals: ["lower", "core"], difficulty: "intermediate", cue: "Hinge, back leg high, flat back", description: "Balance on one leg and hinge forward, letting your back leg rise behind you and your hands lower toward the floor. Keep a flat back, return to standing, then switch legs." },
  { id: "squat-jacks", name: "Squat Jacks", goals: ["lower", "cardio"], difficulty: "intermediate", cue: "Jump feet wide into a squat", description: "From a narrow stance, jump your feet out wide and drop into a squat, then jump them back together as you stand. Stay low and light." },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squats", goals: ["lower"], difficulty: "advanced", cue: "Rear foot up, drop straight down", description: "Place your rear foot on a raised surface behind you. Lower straight down on your front leg until your thigh is parallel, then drive up. Switch legs halfway." },
  { id: "cossack-squats", name: "Cossack Squats", goals: ["lower"], difficulty: "advanced", cue: "Shift side to side, heel down", description: "From a wide stance, shift your weight to one side and lower into a deep squat over that leg while the other stays straight with toes up. Shift across and repeat." },
  { id: "pistol-squat", name: "Assisted Pistol Squats", goals: ["lower"], difficulty: "advanced", cue: "One leg, sit and stand tall", description: "Balance on one leg with the other extended in front. Sit your hips back and lower as far as you can control, then stand. Hold a rail or doorframe for balance. Switch legs." },

  // ---- Core ----
  { id: "plank", name: "Forearm Plank", goals: ["core"], difficulty: "beginner", cue: "Ribs down, glutes tight", description: "Rest on your forearms and toes with your body in a straight line. Pull your ribs down, squeeze your glutes, and hold without letting your hips sag or pike up." },
  { id: "mountain-climbers", name: "Mountain Climbers", goals: ["core", "cardio", "full"], difficulty: "intermediate", cue: "Fast knees, quiet hands", description: "From a high plank, quickly drive one knee toward your chest, then switch legs in a running motion. Keep your hands planted and your hips low." },
  { id: "bicycle-crunch", name: "Bicycle Crunches", goals: ["core"], difficulty: "beginner", cue: "Elbow to opposite knee", description: "Lie on your back with hands behind your head. Bring one elbow toward the opposite knee while extending the other leg, then switch in a pedaling motion." },
  { id: "russian-twist", name: "Russian Twists", goals: ["core"], difficulty: "intermediate", cue: "Lean back, rotate from ribs", description: "Sit with knees bent and lean back slightly. Rotate your torso to tap your hands side to side. Lift your feet off the floor to make it harder." },
  { id: "leg-raises", name: "Leg Raises", goals: ["core"], difficulty: "intermediate", cue: "Lower slow, low back flat", description: "Lie flat with legs straight. Keeping your lower back pressed down, raise your legs toward vertical, then lower them slowly without touching the floor." },
  { id: "flutter-kicks", name: "Flutter Kicks", goals: ["core"], difficulty: "beginner", cue: "Small kicks, navel pulled in", description: "Lie on your back with legs straight and slightly raised. Make small, quick up-and-down kicks with alternating legs, keeping your lower back glued to the floor." },
  { id: "hollow-hold", name: "Hollow Hold", goals: ["core"], difficulty: "advanced", cue: "Low back glued down", description: "Lie on your back and lift your shoulders and legs off the floor, arms reaching past your head, forming a shallow banana shape. Press your lower back down and hold." },
  { id: "v-ups", name: "V-Ups", goals: ["core"], difficulty: "advanced", cue: "Reach hands to toes", description: "Lie flat, then simultaneously lift your straight legs and your torso, reaching your hands toward your toes to form a V. Lower under control and repeat." },
  { id: "side-plank-l", name: "Side Plank (L)", goals: ["core"], difficulty: "intermediate", cue: "Stack hips, reach tall", description: "Lie on your left side and prop up on your left forearm, stacking your hips and feet. Lift your hips into a straight line and hold, reaching your top arm tall." },
  { id: "side-plank-r", name: "Side Plank (R)", goals: ["core"], difficulty: "intermediate", cue: "Stack hips, reach tall", description: "Lie on your right side and prop up on your right forearm, stacking your hips and feet. Lift your hips into a straight line and hold, reaching your top arm tall." },
  { id: "dead-bug", name: "Dead Bugs", goals: ["core"], difficulty: "beginner", cue: "Opposite arm and leg, slow", description: "Lie on your back with arms reaching up and knees bent over your hips. Slowly lower the opposite arm and leg toward the floor, then switch, keeping your lower back flat." },
  { id: "superman", name: "Superman", goals: ["core"], difficulty: "beginner", cue: "Lift chest and legs, squeeze", description: "Lie face-down with arms and legs extended. Lift your chest, arms, and legs off the floor at the same time, squeezing your lower back and glutes, then lower." },
  { id: "bird-dog", name: "Bird Dog", goals: ["core"], difficulty: "beginner", cue: "Opposite arm and leg, steady", description: "On hands and knees, extend one arm forward and the opposite leg back until both are in line with your body. Keep your hips level and steady, then switch sides." },
  { id: "sit-ups", name: "Sit-Ups", goals: ["core"], difficulty: "beginner", cue: "Full range, control the descent", description: "Lie on your back with knees bent. Curl all the way up until your torso is upright, then lower yourself back down with control rather than dropping." },
  { id: "reverse-crunch", name: "Reverse Crunches", goals: ["core"], difficulty: "beginner", cue: "Curl hips off the floor", description: "Lie on your back with knees bent over your hips. Curl your hips up off the floor to bring your knees toward your chest, then lower slowly." },
  { id: "heel-taps", name: "Heel Taps", goals: ["core"], difficulty: "beginner", cue: "Side to side, crunch obliques", description: "Lie on your back with knees bent and shoulders slightly raised. Crunch side to side, reaching each hand toward the same-side heel to work the obliques." },
  { id: "toe-touches", name: "Toe Touches", goals: ["core"], difficulty: "intermediate", cue: "Reach up toward your toes", description: "Lie on your back with legs raised straight toward the ceiling. Crunch up and reach your hands toward your toes, then lower your shoulders back down." },
  { id: "scissor-kicks", name: "Scissor Kicks", goals: ["core"], difficulty: "intermediate", cue: "Cross legs over and under", description: "Lie on your back with legs straight and slightly lifted. Cross one leg over the other and switch in a scissoring motion, keeping your lower back down." },
  { id: "hollow-rocks", name: "Hollow Rocks", goals: ["core"], difficulty: "advanced", cue: "Hold the hollow, rock gently", description: "Hold a hollow position — shoulders and legs off the floor, lower back pressed down — and rock gently back and forth as one rigid unit." },
  { id: "side-plank-dips", name: "Side Plank Hip Dips", goals: ["core"], difficulty: "advanced", cue: "Dip hip down, drive back up", description: "From a side plank, lower your hip toward the floor and then drive it back up to the straight-line position. Repeat, then switch sides." },

  // ---- Cardio ----
  { id: "high-knees", name: "High Knees", goals: ["cardio", "full"], difficulty: "intermediate", cue: "Knees to hip height", description: "Run in place, driving each knee up to hip height while pumping your arms. Stay on the balls of your feet and keep a quick tempo." },
  { id: "butt-kicks", name: "Butt Kicks", goals: ["cardio"], difficulty: "beginner", cue: "Heels to glutes, quick", description: "Jog in place, flicking your heels up to tap your glutes with each step. Keep your knees pointing down and stay light and quick." },
  { id: "skaters", name: "Skater Hops", goals: ["cardio", "lower"], difficulty: "intermediate", cue: "Bound side to side", description: "Leap sideways from one foot to the other, landing softly on the outside leg while the other sweeps behind you, like a speed skater. Keep bounding side to side." },
  { id: "fast-feet", name: "Fast Feet", goals: ["cardio"], difficulty: "beginner", cue: "Tiny quick steps, low", description: "Stay low in an athletic stance and run your feet in place as fast as possible with tiny, rapid steps." },
  { id: "tuck-jumps", name: "Tuck Jumps", goals: ["cardio", "lower"], difficulty: "advanced", cue: "Drive knees up, land soft", description: "Jump straight up and drive both knees toward your chest at the top, then land softly with bent knees and immediately repeat." },
  { id: "lateral-shuffle", name: "Lateral Shuffle", goals: ["cardio"], difficulty: "beginner", cue: "Stay low, push off outside foot", description: "Stay low in a quarter squat and shuffle several steps to one side, then back, pushing off your outside foot. Keep your chest up and feet quick." },
  { id: "sprint-in-place", name: "Sprint in Place", goals: ["cardio"], difficulty: "intermediate", cue: "Pump arms, full effort", description: "Run in place at maximum effort, driving your knees and pumping your arms hard for the whole interval." },
  { id: "seal-jacks", name: "Seal Jacks", goals: ["cardio"], difficulty: "beginner", cue: "Clap in front, open wide", description: "Like a jumping jack, but bring your arms straight out in front and clap your hands together as your feet come together, opening wide again as you jump out." },
  { id: "cross-jacks", name: "Cross Jacks", goals: ["cardio"], difficulty: "beginner", cue: "Cross arms and feet, switch", description: "Jump and cross one arm over the other in front of you while crossing your feet, then jump and switch which arm and foot are on top." },
  { id: "jump-rope", name: "Invisible Jump Rope", goals: ["cardio"], difficulty: "beginner", cue: "Light bounces, quick wrists", description: "Bounce lightly on the balls of your feet as if turning a jump rope, making small quick circles with your wrists. No rope needed." },
  { id: "quarter-turn-jumps", name: "180° Jump Squats", goals: ["cardio", "lower"], difficulty: "advanced", cue: "Jump, spin half, land soft", description: "Drop into a squat, then jump up and rotate 180° to face the other way, landing softly in a squat. Jump and spin back the other direction and repeat." },
  { id: "broad-jumps", name: "Broad Jumps", goals: ["cardio", "lower"], difficulty: "advanced", cue: "Leap far, stick the landing", description: "Bend your knees and swing your arms, then jump forward as far as you can. Land softly with bent knees, reset (turn around if needed), and repeat." },
];

/**
 * Dynamic warmup moves — light, mobility-focused. Goal tags let us bias toward
 * the area being trained; "full" entries are universally useful.
 */
export const WARMUP_MOVES: Exercise[] = [
  { id: "wu-arm-circles", name: "Arm Circles", goals: ["upper", "full"], difficulty: "beginner", cue: "Forward then backward, open up", description: "Extend your arms out to the sides and draw circles, starting small and growing larger. Switch directions halfway to loosen the shoulders." },
  { id: "wu-shoulder-rolls", name: "Shoulder Rolls", goals: ["upper", "full"], difficulty: "beginner", cue: "Big slow rolls, loosen up", description: "Roll your shoulders up, back, and down in big slow circles, then reverse direction to ease tension before training." },
  { id: "wu-neck-rolls", name: "Neck Rolls", goals: ["upper", "full"], difficulty: "beginner", cue: "Gentle half-circles, no force", description: "Gently tip your head and trace slow half-circles from shoulder to shoulder. Stay within a comfortable range — never force it." },
  { id: "wu-torso-twists", name: "Torso Twists", goals: ["core", "full"], difficulty: "beginner", cue: "Rotate from the waist, arms loose", description: "Stand with soft knees and let your arms swing freely as you rotate your torso side to side, gradually increasing the range." },
  { id: "wu-hip-circles", name: "Hip Circles", goals: ["lower", "core", "full"], difficulty: "beginner", cue: "Hands on hips, wide circles", description: "Hands on your hips, make big slow circles with your hips in one direction, then the other, to open up the hip joints." },
  { id: "wu-leg-swings", name: "Leg Swings", goals: ["lower", "full"], difficulty: "beginner", cue: "Front to back, hold support", description: "Hold something for balance and swing one leg forward and back in a relaxed arc, then switch legs. Keep your torso upright." },
  { id: "wu-ankle-rolls", name: "Ankle Rolls", goals: ["lower"], difficulty: "beginner", cue: "Both directions, each foot", description: "Lift one foot and roll the ankle in slow circles both directions, then switch feet to prep the ankles." },
  { id: "wu-march", name: "March in Place", goals: ["cardio", "full"], difficulty: "beginner", cue: "Lift knees, pump arms easy", description: "March in place, lifting your knees and gently swinging your arms to gradually raise your heart rate." },
  { id: "wu-easy-jacks", name: "Easy Jumping Jacks", goals: ["cardio", "full"], difficulty: "beginner", cue: "Light and controlled, warm up", description: "Perform jumping jacks at a relaxed, controlled pace to warm up the whole body without going all-out." },
  { id: "wu-bodyweight-squats", name: "Slow Bodyweight Squats", goals: ["lower", "full"], difficulty: "beginner", cue: "Easy depth, find the groove", description: "Do slow squats to a comfortable depth, focusing on smooth movement to wake up the hips, knees, and ankles." },
  { id: "wu-walkouts", name: "Walkouts", goals: ["full", "core"], difficulty: "beginner", cue: "Hinge, walk hands out, walk back", description: "Hinge forward, walk your hands out to a plank, pause, then walk them back and stand. Warms up the whole body." },
  { id: "wu-cat-cow", name: "Cat-Cow", goals: ["core", "full"], difficulty: "beginner", cue: "Arch and round, follow your breath", description: "On hands and knees, alternately arch your back and round it, moving with your breath to mobilize the spine." },
  { id: "wu-lunge-twist", name: "Lunge with Twist", goals: ["lower", "core", "full"], difficulty: "beginner", cue: "Step out, rotate over front leg", description: "Step into a forward lunge and rotate your torso over your front leg, then return and switch sides to open the hips and mid-back." },
  { id: "wu-side-bends", name: "Standing Side Bends", goals: ["core", "full"], difficulty: "beginner", cue: "Reach overhead, lengthen each side", description: "Stand tall, reach one arm overhead, and lean to the opposite side to lengthen your waist. Alternate sides." },
];

/**
 * Static cooldown stretches — held and calm. Goal tags bias toward the area
 * that was worked.
 */
export const COOLDOWN_MOVES: Exercise[] = [
  { id: "cd-hamstring", name: "Hamstring Stretch", goals: ["lower", "full"], difficulty: "beginner", cue: "Hinge forward, soft knees, relax", description: "Stand or sit and hinge forward with soft knees, reaching toward your toes until you feel a gentle stretch in the back of your legs. Relax and breathe." },
  { id: "cd-quad", name: "Standing Quad Stretch", goals: ["lower"], difficulty: "beginner", cue: "Heel to glute, knees together", description: "Stand on one leg, grab the other ankle, and pull your heel toward your glute with knees together. Hold, then switch sides." },
  { id: "cd-calf", name: "Calf Stretch", goals: ["lower"], difficulty: "beginner", cue: "Back heel down, lean into wall", description: "Step one foot back and press the heel into the floor, leaning forward (a wall helps) until you feel a stretch in the calf. Switch sides." },
  { id: "cd-figure-four", name: "Figure-Four Glute Stretch", goals: ["lower"], difficulty: "beginner", cue: "Ankle over knee, sit back gently", description: "Lying or seated, cross one ankle over the opposite knee and gently draw the legs toward you to stretch the glute. Switch sides." },
  { id: "cd-hip-flexor", name: "Hip Flexor Stretch", goals: ["lower", "core"], difficulty: "beginner", cue: "Half kneel, tuck hips, ease forward", description: "Kneel on one knee with the other foot in front. Tuck your hips under and ease forward to stretch the front of the back hip. Switch sides." },
  { id: "cd-chest", name: "Chest Stretch", goals: ["upper"], difficulty: "beginner", cue: "Clasp hands behind, open the chest", description: "Clasp your hands behind your back and gently straighten your arms, lifting them slightly to open across the chest and front of the shoulders." },
  { id: "cd-triceps", name: "Triceps Stretch", goals: ["upper"], difficulty: "beginner", cue: "Elbow overhead, gently guide back", description: "Reach one hand down your back with the elbow pointing up, and use the other hand to gently guide the elbow back. Switch sides." },
  { id: "cd-shoulder", name: "Cross-Body Shoulder Stretch", goals: ["upper"], difficulty: "beginner", cue: "Pull arm across, breathe slow", description: "Bring one arm straight across your chest and use the other arm to gently pull it closer, stretching the back of the shoulder. Switch sides." },
  { id: "cd-cobra", name: "Cobra Stretch", goals: ["core", "full"], difficulty: "beginner", cue: "Press up, lengthen the front", description: "Lie face-down and press your hands into the floor to lift your chest, keeping your hips down, to gently stretch the abs and lower back." },
  { id: "cd-child", name: "Child's Pose", goals: ["full", "core"], difficulty: "beginner", cue: "Hips to heels, reach long, exhale", description: "Kneel and sit your hips back toward your heels, reaching your arms forward on the floor and letting your chest sink. Breathe slowly." },
  { id: "cd-forward-fold", name: "Seated Forward Fold", goals: ["lower", "full"], difficulty: "beginner", cue: "Reach for toes, let the back round", description: "Sit with legs extended and reach toward your toes, letting your back round gently, to stretch the hamstrings and back." },
  { id: "cd-butterfly", name: "Butterfly Stretch", goals: ["lower", "core"], difficulty: "beginner", cue: "Soles together, knees drift down", description: "Sit with the soles of your feet together and let your knees fall open, gently easing forward to stretch the inner thighs." },
  { id: "cd-neck", name: "Neck Stretch", goals: ["upper", "full"], difficulty: "beginner", cue: "Ear toward shoulder, hold each side", description: "Gently tilt one ear toward your shoulder until you feel a light stretch along the side of your neck. Hold, then switch sides." },
  { id: "cd-breathe", name: "Deep Breathing", goals: ["full", "cardio", "core", "upper", "lower"], difficulty: "beginner", cue: "Slow inhale, longer exhale, settle", description: "Stand or sit tall and take slow, deep breaths — a long inhale through the nose and an even longer exhale — to bring your heart rate down." },
];

const difficultyRank: Record<Exercise["difficulty"], number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

/**
 * Pool of exercises for a goal at or below the chosen difficulty (so an
 * "advanced" workout can still mix in easier movements for variety, but a
 * "beginner" workout never surfaces advanced ones).
 */
export function poolFor(
  goal: Exercise["goals"][number],
  maxDifficulty: Exercise["difficulty"],
  source: Exercise[] = EXERCISES,
): Exercise[] {
  const cap = difficultyRank[maxDifficulty];
  const pool = source.filter(
    (e) => e.goals.includes(goal) && difficultyRank[e.difficulty] <= cap,
  );
  // Fallback: if nothing matches the difficulty cap, return all for the goal.
  return pool.length > 0 ? pool : source.filter((e) => e.goals.includes(goal));
}

/**
 * Stretch pool for warmup/cooldown, biased toward the trained goal but always
 * wide enough to fill the section (falls back to the full list).
 */
export function stretchPool(
  list: Exercise[],
  goal: Exercise["goals"][number],
): Exercise[] {
  const matched = list.filter((s) => s.goals.includes(goal) || s.goals.includes("full"));
  return matched.length >= 2 ? matched : list;
}
