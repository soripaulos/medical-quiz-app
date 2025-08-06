import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Reset the logged_in_number to 1 (keeping current session only)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        logged_in_number: 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error resetting session count:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset sessions' },
        { status: 500 }
      )
    }

    console.log(`User ${user.id} session count reset to 1`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'All other sessions have been ended' 
    })

  } catch (error) {
    console.error('Unexpected error in reset sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}