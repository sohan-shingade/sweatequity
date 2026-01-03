import { GoogleGenAI } from "@google/genai";
import { WeekState, User, WorkoutLog } from '../types';

// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getRefereeCommentary = async (
  weekState: WeekState,
  users: User[],
  logs: WorkoutLog[],
  currentDate: Date
): Promise<string> => {
  try {
    const user1 = users[0];
    const user2 = users[1];
    
    // Filter logs for this week (simplified logic for demo)
    // In a real app, strict date math would be here.
    const user1Logs = logs.filter(l => l.userId === user1.id).length;
    const user2Logs = logs.filter(l => l.userId === user2.id).length;

    const user1Debt = Math.max(0, (user1.goalDays - user1Logs) * weekState.wagerAmount);
    const user2Debt = Math.max(0, (user2.goalDays - user2Logs) * weekState.wagerAmount);

    const prompt = `
      You are a tough, witty fitness referee for a couple's accountability challenge called 'SweatEquity'.
      
      The Wager: $${weekState.wagerAmount} per missed workout.
      The Goal: ${users[0].goalDays} days/week.
      
      Current Standings:
      - ${user1.name}: Completed ${user1Logs} workouts. Potential Debt: $${user1Debt}.
      - ${user2.name}: Completed ${user2Logs} workouts. Potential Debt: $${user2Debt}.
      
      It is currently day ${currentDate.getDay() + 1} of the week.
      
      Generate a short, spicy commentary (max 3 sentences). 
      If someone is losing money, roast them. 
      If it's close, hype up the battle. 
      Use emojis.
    `;

    

    return "Keep pushing! The week isn't over yet!";
  } catch (error) {
    console.error("Gemini Referee Error:", error);
    return "Referee is taking a water break. Check back later!";
  }
};
