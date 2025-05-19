// This function takes geographic coordinates (latitude and longitude)
// and returns a human-readable address using OpenStreetMap's Nominatim API.
export async function getAddressFromCoordinates(lat: number, lng: number) {
  try {
    const response = await fetch(
      'https://ijdizbjsobnywmspbhtv.supabase.co/functions/v1/reverse-geocode',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZGl6Ympzb2JueXdtc3BiaHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1OTk2MDUsImV4cCI6MjA1OTE3NTYwNX0.K4V9-XYHfjy7ttA17ZpOk2jXH0kc9JR3l4CcZq3kb9Y',
        },
        body: JSON.stringify({ lat, lng }),
      }
    );

    const data = await response.json();
    return {
      street: data.street,
      neighborhood: data.neighborhood,
    };
  } catch (error) {
    console.error('Error fetching address from Supabase Edge Function:', error);
    return {
      street: 'Unknown location',
      neighborhood: '',
    };
  }
}
