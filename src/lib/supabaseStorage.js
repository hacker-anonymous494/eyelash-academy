import { supabase } from '@/config/supabase';

/**
 * Get a signed URL for a video file stored in the 'course-videos' bucket.
 * @param {string} path - The file path (e.g., 'course-1/module-2/lesson-3.mp4')
 * @param {number} expiresIn - Seconds until expiry (default 3600 = 1 hour)
 * @returns {Promise<string|null>} The signed URL, or null on error
 */
export async function getSignedVideoUrl(path, expiresIn = 3600) {
  if (!path) return null;
  const { data, error } = await supabase
    .storage
    .from('course-videos')
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  return data.signedUrl;
}