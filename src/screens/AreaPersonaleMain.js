import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../styles/global';
import ProfileScreen from './ProfileScreen';
import CitizenTicketsScreen from './CitizenTicketsScreen';
import OperatorTicketsScreen from './OperatorTicketsScreen';
import ResponsibleTicketsScreen from './ResponsibleTicketsScreen';
import ManageOperatorsScreen from './ManageOperatorsScreen'; // <--- NUOVO IMPORT
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function AreaPersonaleMain({ navigation }) {
  const [active, setActive] = useState('profile');
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 700;
  const userRole = (user?.role || '').toLowerCase();

  const renderContent = () => {
    switch(active) {
      case 'profile': return <ProfileScreen />;
      case 'mytickets': return <CitizenTicketsScreen navigation={navigation} />;
      case 'operator': return <OperatorTicketsScreen navigation={navigation} />;
      case 'responsible_tickets': return <ResponsibleTicketsScreen navigation={navigation} />;
      case 'responsible_users': return <ManageOperatorsScreen navigation={navigation} />; // <--- NUOVO CASE
      default: return <ProfileScreen />;
    }
  }

  // Helper per renderizzare i bottoni del menu
  const MenuButton = ({ id, label, icon, mobile }) => {
    const isActive = active === id;
    if (mobile) {
      return (
        <TouchableOpacity style={[styles.tabPill, isActive && styles.tabActive]} onPress={() => setActive(id)}>
          <Ionicons name={icon} size={16} color={isActive? '#fff' : '#234'} />
          <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={[styles.navLink, isActive && styles.active]} onPress={() => setActive(id)}>
        <Ionicons name={icon} size={18} color={isActive ? '#fff' : '#ccc'} />
        <Text style={[styles.navText, isActive && styles.activeText]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  if (isMobile) {
    // Mobile: top horizontal nav
    return (
      <View style={{flex:1, backgroundColor:COLORS.bg}}>
        <View style={styles.topbarMobile}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:12}}>
            <MenuButton id="profile" label="Profilo" icon="person" mobile={true} />
            
            {userRole === 'cittadino' && (
               <MenuButton id="mytickets" label="Le mie segnalazioni" icon="list" mobile={true} />
            )}

            {userRole === 'operatore' && (
               <MenuButton id="operator" label="Lavori" icon="hammer" mobile={true} />
            )}

            {userRole === 'responsabile' && (
              <>
                <MenuButton id="responsible_tickets" label="Ticket" icon="folder-open" mobile={true} />
                <MenuButton id="responsible_users" label="Operatori" icon="people" mobile={true} />
              </>
            )}
          </ScrollView>
        </View>

        <View style={{flex:1,padding:12}}>
          {renderContent()}
        </View>
      </View>
    );
  }

  // Desktop / Tablet Sidebar
  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Civitas</Text>
          <Text style={styles.sidebarSub}>{user?.name || ''}</Text>
        </View>

        <ScrollView style={styles.nav}>
          <MenuButton id="profile" label="Profilo" icon="person" mobile={false} />

          { userRole === 'cittadino' && (
            <MenuButton id="mytickets" label="Le mie segnalazioni" icon="list" mobile={false} />
          )}

          { userRole === 'operatore' && (
            <MenuButton id="operator" label="Gestione Ticket (Op)" icon="hammer" mobile={false} />
          )}

          { userRole === 'responsabile' && (
            <>
              <Text style={styles.sectionHeader}>GESTIONE</Text>
              <MenuButton id="responsible_tickets" label="Tutti i Ticket" icon="folder-open" mobile={false} />
              <MenuButton id="responsible_users" label="Operatori" icon="people" mobile={false} />
            </>
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
            <Text style={styles.roleBadge}>{user?.role || 'Cittadino'}</Text>
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
  sectionHeader: { color: '#aaa', fontSize: 10, fontWeight: 'bold', marginTop: 15, marginBottom: 5, letterSpacing: 1 },
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