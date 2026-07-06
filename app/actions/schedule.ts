// app/actions/schedule.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Tipe data pendukung
export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu'
export type ScheduleStatus = 'TODO' | 'ONGOING' | 'DONE' | 'CANCELLED'
export type SchedulePriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type ScheduleCategory = 'WORK' | 'STUDY' | 'HEALTH' | 'PERSONAL' | 'SOCIAL' | 'OTHER'

interface ScheduleInput {
  hari: DayOfWeek
  nama_kegiatan: string
  jam_mulai: string
  jam_selesai: string
  kategori?: ScheduleCategory
  priority?: SchedulePriority
  status?: ScheduleStatus
  reminder_minutes?: number
  catatan?: string | null
}

/**
 * 1. MENGAMBIL JADWAL BERDASARKAN HARI
 */
export async function getSchedulesByDay(day: DayOfWeek) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', user.id)
    .eq('hari', day)
    .order('jam_mulai', { ascending: true })

  if (error) throw error
  return data
}

/**
 * 2. MEMBUAT JADWAL BARU
 */
export async function createSchedule(input: ScheduleInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('User not authenticated')

  const scheduleData = {
    ...input,
    user_id: user.id,
    status: 'TODO' as ScheduleStatus,
  }

  const { data, error } = await supabase
    .from('schedules')
    .insert([scheduleData])
    .select()
    .single()

  if (error) throw error
  
  // **TAMBAHAN: Buat notifikasi jika schedule dibuat dalam waktu dekat**
  if (data) {
    await createScheduleNotifications(
      data.id,
      user.id,
      data.nama_kegiatan,
      data.jam_mulai,
      data.reminder_minutes || 0
    )
  }
  
  revalidatePath(`/days/${input.hari}`)
  revalidatePath('/dashboard')
  
  return data
}

/**
 * 3. MEMPERBARUI JADWAL (UMUM)
 */
export async function updateSchedule(
  id: string,
  input: {
    hari?: DayOfWeek
    nama_kegiatan?: string
    jam_mulai?: string
    jam_selesai?: string
    kategori?: ScheduleCategory
    priority?: SchedulePriority
    status?: ScheduleStatus
    reminder_minutes?: number
    catatan?: string | null
  }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('schedules') 
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  
  revalidatePath('/dashboard')
  if (input.hari) {
    revalidatePath(`/days/${input.hari}`)
  }
  
  return data
}

/**
 * 4. MENGHAPUS JADWAL
 */
export async function deleteSchedule(id: string, day: DayOfWeek) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
  
  revalidatePath(`/days/${day}`)
  revalidatePath('/dashboard')
  
  return { success: true }
}

/**
 * 5. MENGAMBIL DETAIL JADWAL BY ID
 */
export async function getScheduleById(id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) throw error
  return data
}

/**
 * 6. MEMPERBARUI STATUS JADWAL & MEMBUAT NOTIFIKASI SECARA OTOMATIS
 */
export async function updateScheduleStatus(
  scheduleId: string, 
  userId: string, 
  newStatus: ScheduleStatus, 
  activityName: string
) {
  const supabase = await createClient()

  // 1. Update status ke tabel schedules
  const { data: targetSchedule, error: scheduleError } = await supabase
    .from("schedules")
    .update({ 
      status: newStatus,
      completed_at: newStatus === "DONE" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", scheduleId)
    .eq("user_id", userId)
    .select('hari')
    .single()

  if (scheduleError) return { success: false, error: scheduleError };

  // 2. Tentukan isi pesan notifikasi
  let title = `Kegiatan ${newStatus}`
  let message = `Status kegiatan "${activityName}" telah berubah menjadi ${newStatus}.`
  
  if (newStatus === "CANCELLED") {
    title = `Kegiatan Dibatalkan`
    message = `Kegiatan "${activityName}" otomatis dibatalkan karena melewati batas waktu selesai.`
  } else if (newStatus === "ONGOING") {
    title = `Kegiatan Dimulai`
    message = `Kegiatan "${activityName}" sekarang sedang berlangsung.`
  } else if (newStatus === "DONE") {
    title = `Kegiatan Selesai`
    message = `Selamat! Kegiatan "${activityName}" telah diselesaikan.`
  }

  // 3. Masukkan record baru ke tabel notifications
  await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      schedule_id: scheduleId,
      title: title,
      message: message,
      notification_time: new Date().toISOString(),
      is_read: false
    })

  // 4. Revalidasi path agar tampilan UI langsung update
  revalidatePath('/dashboard')
  if (targetSchedule?.hari) {
    revalidatePath(`/days/${targetSchedule.hari}`)
  }

  return { success: true }
}

/**
 * 7. RESET MINGGUAN (MENGUBAH SEMUA STATUS MENJADI 'TODO' DI HARI SENIN)
 */
export async function resetWeeklySchedules(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("schedules")
    .update({ 
      status: "TODO" as ScheduleStatus, 
      completed_at: null,
      updated_at: new Date().toISOString() 
    })
    .eq("user_id", userId)
    
  if (!error) {
    revalidatePath('/dashboard')
  }
  
  return { success: !error }
}

/**
 * 8. FUNGSI TAMBAHAN: MEMBUAT NOTIFIKASI SAAT SCHEDULE DIBUAT
 */
export async function createScheduleNotifications(
  scheduleId: string,
  userId: string,
  namaKegiatan: string,
  jamMulai: string,
  reminderMinutes: number
) {
  const supabase = await createClient()
  
  // Parse waktu untuk cek apakah kegiatan akan dimulai dalam waktu dekat
  const now = new Date()
  const [startHour, startMinute] = jamMulai.split(":").map(Number)
  const startMinTotal = startHour * 60 + startMinute
  const currentMinTotal = now.getHours() * 60 + now.getMinutes()
  const minutesUntilStart = startMinTotal - currentMinTotal

  // Hanya proses jika kegiatan belum dimulai (minutesUntilStart > 0)
  if (minutesUntilStart <= 0) {
    return // Kegiatan sudah lewat atau sedang berlangsung
  }

  // NOTIFIKASI PENTING: Jika kegiatan dibuat ME PET (kurang dari atau sama dengan reminder_minutes)
  // Maka langsung tampilkan notifikasi saat itu juga
  const isImminent = minutesUntilStart <= reminderMinutes && reminderMinutes > 0
  
  // NOTIFIKASI DARURAT: Jika kegiatan dibuat SANGAT MEPET (kurang dari 10 menit)
  // Tampilkan notifikasi peringatan segera dimulai
  const isVeryClose = minutesUntilStart <= 10 && minutesUntilStart > 0

  // 1. Buat notifikasi reminder jika dibuat dalam rentang reminder_minutes
  if (isImminent) {
    // Notifikasi utama: pengingat sesuai reminder_minutes
    await supabase.from("notifications").insert({
      user_id: userId,
      schedule_id: scheduleId,
      title: "Pengingat Kegiatan (Mendadak)",
      message: `Kegiatan "${namaKegiatan}" akan dimulai dalam ${minutesUntilStart} menit. (Dibuat mendadak)`,
      notification_time: new Date().toISOString(),
      is_read: false
    })
  } else if (reminderMinutes > 0) {
    // Notifikasi normal: jika dibuat jauh-jauh hari sebelum reminder
    await supabase.from("notifications").insert({
      user_id: userId,
      schedule_id: scheduleId,
      title: "Pengingat Kegiatan",
      message: `Kegiatan "${namaKegiatan}" akan dimulai dalam ${reminderMinutes} menit.`,
      notification_time: new Date(Date.now() + reminderMinutes * 60000).toISOString(), // Di-schedule sesuai reminder
      is_read: false
    })
  }

  // 2. Jika kegiatan dibuat SANGAT MEPET (<= 10 menit), tampilkan notifikasi "Segera Dimulai"
  if (isVeryClose && minutesUntilStart <= 10) {
    // Buat notifikasi peringatan "Segera Dimulai!" dengan waktu yang berbeda
    if (minutesUntilStart >= 2) {
      // Notifikasi akan muncul sekarang (immediate)
      await supabase.from("notifications").insert({
        user_id: userId,
        schedule_id: scheduleId,
        title: "Segera Dimulai!",
        message: `Kegiatan "${namaKegiatan}" akan dimulai dalam ${minutesUntilStart} menit. Siapkan diri Anda!`,
        notification_time: new Date().toISOString(), // Langsung muncul
        is_read: false
      })
    } else if (minutesUntilStart < 2 && minutesUntilStart > 0) {
      // Kurang dari 2 menit, notifikasi lebih mendesak
      await supabase.from("notifications").insert({
        user_id: userId,
        schedule_id: scheduleId,
        title: "🚨 Segera Dimulai!",
        message: `Kegiatan "${namaKegiatan}" akan dimulai dalam ${minutesUntilStart} menit!`,
        notification_time: new Date().toISOString(), // Langsung muncul
        is_read: false
      })
    }
  }


  // 4. NOTIFIKASI KHUSUS: Jika reminder_minutes = 0 (tanpa pengingat)
  if (reminderMinutes === 0) {
    // Tetap tampilkan notifikasi "Segera Dimulai" jika mepet
    if (isVeryClose) {
      await supabase.from("notifications").insert({
        user_id: userId,
        schedule_id: scheduleId,
        title: "Tanpa Pengingat - Segera Dimulai!",
        message: `Kegiatan "${namaKegiatan}" akan dimulai dalam ${minutesUntilStart} menit.`,
        notification_time: new Date().toISOString(),
        is_read: false
      })
    }
  }
}

/**
 * 8b. FUNGSI TAMBAHAN: MEMPROSES NOTIFIKASI YANG TERJADWAL (UNTUK CRON JOB)
 * Fungsi ini akan dipanggil secara periodik (misal setiap 1 menit) untuk 
 * mengirim notifikasi yang sudah waktunya
 */
export async function processScheduledNotifications() {
  const supabase = await createClient()
  const now = new Date().toISOString()
  
  // Ambil semua notifikasi yang belum dibaca dan waktu notifikasi sudah tiba
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .lte("notification_time", now)
    .order("notification_time", { ascending: true })
  
  if (error || !notifications) return { success: false }
  
  // Untuk setiap notifikasi yang sudah waktunya, update status atau kirim push notification
  for (const notif of notifications) {
    // Di sini Anda bisa menambahkan logika untuk mengirim push notification
    // Misalnya: sendPushNotification(notif.user_id, notif.title, notif.message)
    
    console.log(`📨 Notifikasi dikirim: ${notif.title} - ${notif.message}`)
  }
  
  return { success: true, processed: notifications.length }
}

/**
 * 9. FUNGSI TAMBAHAN: MENGHAPUS NOTIFIKASI YANG SUDAH TIDAK TERPAKAI
 */
export async function deleteExpiredNotifications(userId: string) {
  const supabase = await createClient()
  
  // Hapus notifikasi yang sudah berusia lebih dari 24 jam dan sudah dibaca
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .lt("notification_time", oneDayAgo.toISOString())
    .eq("is_read", true)
  
  return { success: !error }
}

/**
 * 10. FUNGSI TAMBAHAN: MEMBERSIHKAN NOTIFIKASI GANDA
 */
export async function cleanupDuplicateNotifications(userId: string) {
  const supabase = await createClient()
  
  // Ambil semua notifikasi untuk user
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("notification_time", { ascending: false })
  
  if (error || !notifications) return { success: false }
  
  // Cari duplikat berdasarkan schedule_id dan title (dengan toleransi waktu 5 menit)
  const seen = new Map<string, string>() // key -> id notifikasi yang dipertahankan
  const duplicates: string[] = []
  
  for (const notif of notifications) {
    const notifTime = new Date(notif.notification_time).getTime()
    const key = `${notif.schedule_id}-${notif.title}`
    
    if (seen.has(key)) {
      // Cek apakah notifikasi ini duplikat (dalam rentang 5 menit)
      const existingTime = new Date(seen.get(key)!).getTime()
      const timeDiff = Math.abs(notifTime - existingTime) / 60000 // dalam menit
      
      if (timeDiff < 5) {
        duplicates.push(notif.id)
        continue
      }
    }
    
    seen.set(key, notif.id)
  }
  
  // Hapus duplikat (keep yang terbaru)
  if (duplicates.length > 0) {
    await supabase
      .from("notifications")
      .delete()
      .in("id", duplicates)
  }
  
  return { success: true, removedCount: duplicates.length }
}