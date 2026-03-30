import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!url || !key) {
  console.log('Missing env variables');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkAuth() {
  console.log('Attempting to create user admin@pixelwebpages.com with password Abc@12345...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: 'admin@pixelwebpages.com',
    password: 'Abc@12345'
  });

  if (signUpError) {
    if (signUpError.message.includes('User already registered')) {
        console.log('User admin@pixelwebpages.com is ALREADY registered.');
        console.log('Attempting login...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'admin@pixelwebpages.com',
            password: 'Abc@12345'
        });
        if (signInError) {
             console.log('Login failed:', signInError.message);
        } else {
             console.log('Login successful for admin@pixelwebpages.com. You can log in using these credentials.');
        }
    } else {
        console.log('Sign up error:', signUpError.message);
    }
  } else {
    console.log('Sign up result:', signUpData);
    if (signUpData.user?.identities?.length === 0) {
        console.log('User already existed but returned a fake user due to obfuscation setup, or email confirmation is required.');
    }
    console.log('If sign up was successful, email confirmation is likely required OR you can now log in if it is disabled.');
  }
}

checkAuth();
