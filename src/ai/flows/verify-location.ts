// src/ai/flows/verify-location.ts
'use server';

/**
 * @fileOverview A location verification AI agent.
 *
 * - verifyLocation - A function that verifies if the user's current location is within a reasonable proximity to the school's location.
 * - VerifyLocationInput - The input type for the verifyLocation function.
 * - VerifyLocationOutput - The return type for the verifyLocation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyLocationInputSchema = z.object({
  userLatitude: z.number().describe('The latitude of the user.'),
  userLongitude: z.number().describe('The longitude of the user.'),
  schoolLatitude: z.number().describe('The latitude of the school.'),
  schoolLongitude: z.number().describe('The longitude of the school.'),
});
export type VerifyLocationInput = z.infer<typeof VerifyLocationInputSchema>;

const VerifyLocationOutputSchema = z.object({
  isWithinProximity: z
    .boolean()
    .describe(
      'Whether the user is within a reasonable proximity to the school.'
    ),
});
export type VerifyLocationOutput = z.infer<typeof VerifyLocationOutputSchema>;

export async function verifyLocation(input: VerifyLocationInput): Promise<VerifyLocationOutput> {
  return verifyLocationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyLocationPrompt',
  input: {schema: VerifyLocationInputSchema},
  output: {schema: VerifyLocationOutputSchema},
  prompt: `You are a location verification expert.

You will receive the user's current location (latitude and longitude) and the school's location (latitude and longitude).

You will determine if the user is within a reasonable proximity to the school.

User Latitude: {{userLatitude}}
User Longitude: {{userLongitude}}
School Latitude: {{schoolLatitude}}
School Longitude: {{schoolLongitude}}

Consider the proximity to be reasonable if the user is within 100 meters of the school.
`,
});

const verifyLocationFlow = ai.defineFlow(
  {
    name: 'verifyLocationFlow',
    inputSchema: VerifyLocationInputSchema,
    outputSchema: VerifyLocationOutputSchema,
  },
  async input => {
    // Simple Haversine formula to calculate distance between two GPS coordinates
    const earthRadiusKm = 6371;

    const degToRad = (degrees: number) => {
      return degrees * (Math.PI / 180);
    };

    const lat1Rad = degToRad(input.userLatitude);
    const lon1Rad = degToRad(input.userLongitude);
    const lat2Rad = degToRad(input.schoolLatitude);
    const lon2Rad = degToRad(input.schoolLongitude);

    const latDiff = lat2Rad - lat1Rad;
    const lonDiff = lon2Rad - lon1Rad;

    const a = Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(lonDiff / 2) * Math.sin(lonDiff / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceKm = earthRadiusKm * c;
    const distanceMeters = distanceKm * 1000;

    const isWithinProximity = distanceMeters <= 100;

    return {isWithinProximity};
  }
);
