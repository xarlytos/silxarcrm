import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { notificationsService } from '@groomly/shared';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      console.log('Push notifications requieren un dispositivo físico');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permiso de notificaciones denegado');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    const token = tokenData.data;

    // Registrar el token en el backend
    try {
      await notificationsService.registerPushToken(token);
      console.log('Push token registrado:', token);
    } catch (err) {
      console.error('Error registrando push token:', err);
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8636f4',
      });
    }

    return token;
  }, []);

  const scheduleAppointmentReminder = useCallback(
    async (params: {
      appointmentId: string;
      customerName: string;
      petName: string;
      date: string;
      time: string;
      minutesBefore: number;
    }) => {
      const { customerName, petName, date, time, minutesBefore } = params;

      // Calcular la fecha/hora de la notificación
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      const appointmentDate = new Date(year, month - 1, day, hour, minute);
      const triggerDate = new Date(appointmentDate.getTime() - minutesBefore * 60000);

      // Si la fecha ya pasó, no programar
      if (triggerDate.getTime() <= Date.now()) {
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Recordatorio de cita',
          body: `${customerName} - ${petName} a las ${time}`,
          data: { appointmentId: params.appointmentId, type: 'appointment_reminder' },
          sound: 'default',
        },
        trigger: {
          date: triggerDate,
        } as Notifications.DateTriggerInput,
      });

      return identifier;
    },
    []
  );

  const cancelScheduledNotification = useCallback(async (identifier: string) => {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }, []);

  const cancelAllScheduledNotifications = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  const getScheduledNotifications = useCallback(async () => {
    return await Notifications.getAllScheduledNotificationsAsync();
  }, []);

  useEffect(() => {
    // Escuchar notificaciones recibidas en primer plano
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notificación recibida:', notification);
      }
    );

    // Escuchar cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log('Notificación tocada:', data);
        // Aquí podríamos navegar a la pantalla correspondiente
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    registerForPushNotifications,
    scheduleAppointmentReminder,
    cancelScheduledNotification,
    cancelAllScheduledNotifications,
    getScheduledNotifications,
  };
}
