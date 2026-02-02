import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../styles/global';
import ProfileScreen from './ProfileScreen';
import UserTicketsScreen from './UserTicketsScreen'; 
import OperatorTicketsScreen from './OperatorTicketsScreen';
import ResponsibleTicketsScreen from './ResponsibleTicketsScreen';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function AreaPersonaleMain({ navigation }) {
  const [active, setActive] = useState('profile');
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 700;

  // --- FIX RUOLI: Normalizza il ruolo ---
  const getNormalizedRole = () => {
    if (!user || !user.role) return '';
    const r = String(user.role).toLowerCase();
    if (r === '1') return 'cittadino';
    if (r === '2') return 'operatore';
    if (r === '3' || r === '4') return 'responsabile'; 
    return r;
  };
  const currentRole = getNormalizedRole();
  // -------------------------------------

  const renderContent = () => {
    switch(active) {
      case 'profile': return <ProfileScreen />;
      case 'mytickets': return <UserTicketsScreen navigation={navigation} />;
      case 'operator': return <OperatorTicketsScreen navigation={navigation} />;
      case 'responsible': return <ResponsibleTicketsScreen navigation={navigation} />;
      default: return <ProfileScreen />;
    }
  }

  if (isMobile) {
    // Mobile: top horizontal nav
    return (
      <View style={{flex:1, backgroundColor:COLORS.bg}}>
        <View style={styles.topbarMobile}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:12}}>
            <TouchableOpacity style={[styles.tabPill, active==='profile' && styles.tabActive]} onPress={() => setActive('profile')}>
              <Ionicons name="person" size={16} color={active==='profile'? '#fff' : '#234'} />
              <Text style={[styles.tabText, active==='profile' && styles.tabTextActive]}>Profilo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.tabPill, active==='mytickets' && styles.tabActive]} onPress={() => setActive('mytickets')}>
              <Ionicons name="list" size={16} color={active==='mytickets'? '#fff' : '#234'} />
              <Text style={[styles.tabText, active==='mytickets' && styles.tabTextActive]}>Le mie segnalazioni</Text>
            </TouchableOpacity>

            { currentRole === 'operatore' && (
              <TouchableOpacity style={[styles.tabPill, active==='operator' && styles.tabActive]} onPress={() => setActive('operator')}>
                <Ionicons name="hammer" size={16} color={active==='operator'? '#fff' : '#234'} />
                <Text style={[styles.tabText, active==='operator' && styles.tabTextActive]}>Operatori</Text>
              </TouchableOpacity>
            )}

            { currentRole === 'responsabile' && (
              <TouchableOpacity style={[styles.tabPill, active==='responsible' && styles.tabActive]} onPress={() => setActive('responsible')}>
                <Ionicons name="people" size={16} color={active==='responsible'? '#fff' : '#234'} />
                <Text style={[styles.tabText, active==='responsible' && styles.tabTextActive]}>Responsabili</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <View style={{flex:1,padding:12}}>
          {renderContent()}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Civitas</Text>
          <Text style={styles.sidebarSub}>{user?.name || ''}</Text>
        </View>

        <ScrollView style={styles.nav}>
          <TouchableOpacity style={[styles.navLink, active === 'profile' && styles.active]} onPress={() => setActive('profile')}>
            <Ionicons name="person" size={18} color={active === 'profile' ? '#fff' : '#ccc'} />
            <Text style={[styles.navText, active === 'profile' && styles.activeText]}>Profilo</Text>
          </TouchableOpacity>

          { currentRole === 'cittadino' && (
            <TouchableOpacity style={[styles.navLink, active === 'mytickets' && styles.active]} onPress={() => setActive('mytickets')}>
              <Ionicons name="list" size={18} color={active === 'mytickets' ? '#fff' : '#ccc'} />
              <Text style={[styles.navText, active === 'mytickets' && styles.activeText]}>Le mie segnalazioni</Text>
            </TouchableOpacity>
          )}

          { currentRole === 'operatore' && (
            <TouchableOpacity style={[styles.navLink, active === 'operator' && styles.active]} onPress={() => setActive('operator')}>
              <Ionicons name="hammer" size={18} color={active === 'operator' ? '#fff' : '#ccc'} />
              <Text style={[styles.navText, active === 'operator' && styles.activeText]}>Gestione Ticket (Operatori)</Text>
            </TouchableOpacity>
          )}

          { currentRole === 'responsabile' && (
            <TouchableOpacity style={[styles.navLink, active === 'responsible' && styles.active]} onPress={() => setActive('responsible')}>
              <Ionicons name="people" size={18} color={active === 'responsible' ? '#fff' : '#ccc'} />
              <Text style={[styles.navText, active === 'responsible' && styles.activeText]}>Gestione operatori / ticket (Responsabili)</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={styles.sidebarFooter}>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); navigation.navigate('Home'); }}>
            <Ionicons name="log-out" size={16} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.topbar}>
          <Text style={styles.topTitle}>Area Personale</Text>
          <View style={styles.roleWrap}>
            <Text style={styles.roleBadge}>{currentRole ? currentRole.toUpperCase() : 'OSPITE'}</Text>
          </View>
        </View>

        <View style={styles.main}>
          {renderContent()}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex:1, flexDirection: 'row', backgroundColor: COLORS.bg },
  sidebar: { width: 260, backgroundColor: COLORS.primary, padding: 20, color: '#fff', justifyContent: 'space-between' },
  sidebarHeader: { marginBottom: 20 },
  sidebarTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sidebarSub: { color: '#fff', opacity: 0.9, marginTop: 6 },
  nav: { flex:1, marginTop: 10 },
  navLink: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8 },
  navText: { color: '#ccc', marginLeft: 8, fontSize: 14 },
  active: { backgroundColor: 'rgba(255,255,255,0.08)' },
  activeText: { color: '#fff', fontWeight: '700' },
  sidebarFooter: { marginTop: 20 },
  logoutBtn: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  logoutText: { color: '#fff', marginLeft: 8 },
  content: { flex:1, backgroundColor: '#f4f6f9' },
  topbar: { height: 70, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  topTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  roleBadge: { backgroundColor: COLORS.primary, color: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, color: '#fff', fontWeight: '700' },
  main: { flex:1, padding: 20 },
  topbarMobile: { height: 68, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', justifyContent: 'center' },
  tabPill: { paddingVertical:8, paddingHorizontal:12, backgroundColor:'#fff', borderRadius:20, marginRight:8, flexDirection:'row', alignItems:'center', gap:8 },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { marginLeft:6, color:'#234' },
  tabTextActive: { color:'#fff', fontWeight:'700' }
});