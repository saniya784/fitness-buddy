export const SAMPLE_PROGRAMS = [
  {
    id: "beginner-strength",
    title: "Beginner Strength Foundations",
    level: "Beginner",
    goal: "Build strength",
    daysPerWeek: 3,
    equipment: "Bodyweight and optional dumbbells",
    description:
      "A sample full-body routine emphasizing basic movement patterns, gradual progression, and recovery days.",
    schedule: [
      { day: "Monday", focus: "Full-body strength", duration: "30 minutes" },
      { day: "Wednesday", focus: "Mobility and core", duration: "25 minutes" },
      { day: "Friday", focus: "Full-body strength", duration: "30 minutes" },
    ],
    dailyCalories: 2000,
    meals: [
      { name: "Breakfast", foods: ["Oatmeal with berries", "Unsweetened milk"] },
      { name: "Lunch", foods: ["Bean and vegetable bowl", "Whole-grain bread"] },
      { name: "Dinner", foods: ["Baked fish or tofu", "Potatoes", "Vegetables"] },
    ],
  },
  {
    id: "cardio-mobility",
    title: "Low-Impact Cardio and Mobility",
    level: "Beginner",
    goal: "Build an activity habit",
    daysPerWeek: 4,
    equipment: "Comfortable shoes and a chair",
    description:
      "A sample low-impact week with flexible pacing, gentle mobility, and rest between activity days.",
    schedule: [
      { day: "Monday", focus: "Comfortable-paced walk", duration: "20 minutes" },
      { day: "Tuesday", focus: "Gentle mobility", duration: "15 minutes" },
      { day: "Thursday", focus: "Comfortable-paced walk", duration: "20 minutes" },
      { day: "Saturday", focus: "Balance and mobility", duration: "20 minutes" },
    ],
    dailyCalories: 2000,
    meals: [
      { name: "Breakfast", foods: ["Whole-grain toast", "Eggs or beans", "Fruit"] },
      { name: "Lunch", foods: ["Lentil soup", "Mixed salad"] },
      { name: "Dinner", foods: ["Chicken or chickpeas", "Rice", "Vegetables"] },
    ],
  },
  {
    id: "intermediate-hypertrophy",
    title: "Intermediate Strength Split",
    level: "Intermediate",
    goal: "Practice progressive strength training",
    daysPerWeek: 4,
    equipment: "Gym or adjustable dumbbells",
    description:
      "A sample upper/lower split illustrating strength sessions with varied exercises and planned recovery.",
    schedule: [
      { day: "Monday", focus: "Upper body", duration: "45 minutes" },
      { day: "Tuesday", focus: "Lower body", duration: "45 minutes" },
      { day: "Thursday", focus: "Upper body", duration: "45 minutes" },
      { day: "Friday", focus: "Lower body", duration: "45 minutes" },
    ],
    dailyCalories: 2200,
    meals: [
      { name: "Breakfast", foods: ["Yogurt or soy yogurt", "Oats", "Fruit"] },
      { name: "Lunch", foods: ["Chicken or tofu", "Brown rice", "Vegetables"] },
      { name: "Dinner", foods: ["Beans or fish", "Sweet potato", "Greens"] },
    ],
  },
] as const;

export const MEDICAL_DISCLAIMER =
  "Fitness Buddy AI plans are general educational suggestions, not medical advice, diagnosis, or treatment. Consult a qualified healthcare professional before changing exercise or nutrition, and stop if you feel unwell or experience pain.";
