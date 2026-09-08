import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_ENABLED_KEY = "kourou_training_reminder_enabled";
const REMINDER_ID_KEY = "kourou_training_reminder_id";

const reminderCopy = {
  fr: { channel: "Rappels d'entraînement", title: "Votre préparation vous attend", body: "Quelques minutes de QCM aujourd'hui peuvent faire la différence." },
  en: { channel: "Practice reminders", title: "Your preparation is waiting", body: "A few minutes of practice today can make a difference." },
} as const;

type PermissionResult = { granted: boolean };

async function getNotifications() {
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

export async function isTrainingReminderEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(REMINDER_ENABLED_KEY)) === "true";
}

export async function enableTrainingReminder(language: "fr" | "en" = "fr"): Promise<boolean> {
  const Notifications = await getNotifications();
  if (
    !Notifications ||
    typeof Notifications.setNotificationHandler !== "function" ||
    typeof Notifications.getPermissionsAsync !== "function" ||
    typeof Notifications.requestPermissionsAsync !== "function" ||
    typeof Notifications.scheduleNotificationAsync !== "function"
  ) {
    return false;
  }

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    const permissions = await Notifications.getPermissionsAsync();
    let granted = (permissions as PermissionResult).granted;
    if (!granted) {
      granted = (await Notifications.requestPermissionsAsync() as PermissionResult).granted;
    }
    if (!granted) return false;

    const copy = reminderCopy[language];
    if (process.env.EXPO_OS === "android" && typeof Notifications.setNotificationChannelAsync === "function") {
      await Notifications.setNotificationChannelAsync("training-reminders", {
        name: copy.channel,
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await disableTrainingReminder();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        sound: undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
        channelId: "training-reminders",
      },
    });
    await AsyncStorage.setItem(REMINDER_ENABLED_KEY, "true");
    await AsyncStorage.setItem(REMINDER_ID_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export async function disableTrainingReminder(): Promise<void> {
  const Notifications = await getNotifications();
  const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (id && Notifications && typeof Notifications.cancelScheduledNotificationAsync === "function") {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  await AsyncStorage.removeItem(REMINDER_ENABLED_KEY);
  await AsyncStorage.removeItem(REMINDER_ID_KEY);
}