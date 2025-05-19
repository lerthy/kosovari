export const debugImageUrl = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    console.log('Image URL check:', {
      url,
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    return response.ok;
  } catch (error) {
    console.error('Error checking image URL:', {
      url,
      error
    });
    return false;
  }
}; 