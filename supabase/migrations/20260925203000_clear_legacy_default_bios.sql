-- Migration: Clear legacy predefined default bio from existing profiles
UPDATE public.profiles
SET bio = ''
WHERE bio = 'Exploring new places, one trip at a time 🌍';
