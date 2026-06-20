import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { groomersService } from '@groomly/shared';
import { Users, Shield, Mail, Plus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  manager: 'Gerente',
  groomer: 'Peluquero',
  receptionist: 'Recepcionista',
  readonly: 'Solo lectura',
};

const ROLE_COLORS: Record<string, string> = {
  owner: '#00D4FF',
  admin: '#7B61FF',
  manager: '#00FF88',
  groomer: '#FFD740',
  receptionist: '#9AA3B2',
  readonly: '#5A616D',
};

export default function EquipoPage() {
  const { colors } = useTheme();
  const { data: groomersData, isLoading } = useQuery({
    queryKey: ['groomers-equipo'],
    queryFn: () => groomersService.listGroomers(),
  });

  const groomers = groomersData ?? [];
  const activeMembers = groomers.filter((g) => g.active);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Equipo</Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Users size={20} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.primary }]}>{activeMembers.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Activos</Text>
          </Card>
          <Card style={styles.statCard}>
            <Shield size={20} color={colors.success} />
            <Text style={[styles.statNumber, { color: colors.success }]}>{groomers.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
          </Card>
        </View>

        {/* Members list */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Miembros del equipo</Text>

        {isLoading ? (
          <View style={styles.center}>
            <Text style={{ color: colors.textMuted }}>Cargando...</Text>
          </View>
        ) : groomers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Users size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay miembros en el equipo</Text>
          </Card>
        ) : (
          groomers.map((g) => {
            const role = g.role || 'groomer';
            return (
              <Card key={g.id} style={[styles.memberCard, !g.active && { opacity: 0.5 }]}>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: `${g.color || colors.primary}20` },
                    ]}
                  >
                    <Text style={[styles.memberAvatarText, { color: g.color || colors.primary }]}>
                      {g.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{g.name}</Text>
                    <View style={styles.row}>
                      <View
                        style={[
                          styles.roleDot,
                          { backgroundColor: ROLE_COLORS[role] || colors.textMuted },
                        ]}
                      />
                      <Text style={[styles.roleText, { color: colors.textMuted }]}>
                        {ROLE_LABELS[role] || role}
                      </Text>
                    </View>
                    {g.email && (
                      <View style={styles.row}>
                        <Mail size={12} color={colors.textMuted} />
                        <Text style={[styles.emailText, { color: colors.textMuted }]}>{g.email}</Text>
                      </View>
                    )}
                  </View>
                  {!g.active && (
                    <Text style={[styles.inactiveText, { color: colors.textMuted }]}>Inactivo</Text>
                  )}
                </View>
              </Card>
            );
          })
        )}

        {/* Invite hint */}
        <Card style={[styles.inviteCard, { backgroundColor: `${colors.primary}10` }]}>
          <View style={styles.row}>
            <View style={[styles.inviteIcon, { backgroundColor: `${colors.primary}12` }]}>
              <Plus size={20} color={colors.primary} />
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.inviteTitle, { color: colors.text }]}>Invitar miembro</Text>
              <Text style={[styles.inviteSubtitle, { color: colors.textMuted }]}>
                Añade peluqueros, recepcionistas o administradores
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNumber: {
    fontWeight: '700',
    fontSize: 20,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  memberCard: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontWeight: '700',
    fontSize: 18,
  },
  infoCol: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    marginTop: 2,
  },
  roleText: {
    fontSize: 13,
  },
  emailText: {
    fontSize: 11,
    marginLeft: 4,
    marginTop: 2,
  },
  inactiveText: {
    fontSize: 11,
  },
  inviteCard: {
    marginBottom: 24,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  inviteSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});