import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from './SearchBar';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/global';

export default function AppHeader({ navigation, searchText, setSearchText, onSearch }) {
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  const initials = (user?.name || 'U').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();

  return (
    <View style={styles.header}>
      {/* Search on the left */}
      <View style={styles.left}>
        <SearchBar value={searchText} onChange={setSearchText} onSearch={onSearch} />
      </View>

      {/* Right: login/register or avatar */}
      <View style={styles.right}>
        {user ? (
          <TouchableOpacity style={styles.avatar} onPress={() => setMenuVisible(true)}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{flexDirection:'row'}}>
            <TouchableOpacity style={styles.accessBtn} onPress={() => navigation.navigate('Login')}><Text style={styles.accessText}>Accedi</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.accessBtn,{marginLeft:8}]} onPress={() => navigation.navigate('Register')}><Text style={styles.accessText}>Registrati</Text></TouchableOpacity>
          </View>
        )}
      </View>

      <Modal animationType="fade" transparent visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)} />
        <View style={styles.menuWrapRight}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('AreaPersonale'); }}>
            <Ionicons name="person" size={18} color={COLORS.primary} />
            <Text style={styles.menuText}>Area Personale</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={async () => { setMenuVisible(false); await logout(); navigation.navigate('Home'); }}>
            <Ionicons name="log-out" size={18} color={COLORS.primary} />
            <Text style={styles.menuText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 88, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingTop: 20, flexDirection: 'row', alignItems: 'center' },
  left: { flex: 1, justifyContent: 'center' },
  right: { width: 160, alignItems: 'flex-end', justifyContent: 'center' },
  avatar: { width:44, height:44, borderRadius:22, backgroundColor:'#fff', justifyContent:'center', alignItems:'center', shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  avatarText: { color: COLORS.primary, fontWeight:'700' },
  accessBtn: { paddingVertical:6, paddingHorizontal:10, borderRadius:18, backgroundColor:'rgba(255,255,255,0.08)' },
  accessText: { color:'#fff', fontWeight:'700' },
  modalOverlay: { position:'absolute', top:0,left:0,right:0,bottom:0, backgroundColor:'rgba(0,0,0,0.3)' },
  menuWrapRight: { position:'absolute', top:84, right:12, width:180, backgroundColor:'#fff', borderRadius:8, padding:12, elevation:6 },
  menuItem: { flexDirection:'row', alignItems:'center', paddingVertical:10 },
  menuText: { marginLeft:12, color:COLORS.primary, fontWeight:'700' }
});