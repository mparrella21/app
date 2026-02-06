import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from './SearchBar';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/global';

export default function AppHeader({ navigation, searchText, setSearchText, onSearch }) {
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  const initials = user?.name ? user.name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase() : 'Guest';

  // Logica per determinare se è admin
  const isAdmin = user?.role === 'admin';

  return (
    <View style={styles.header}>
      {/* ... Left e Right sections rimangono uguali ... */}
      
      {/* Right: Actions */}
      <View style={styles.right}>
        {/* Campanella... */}
        
        {/* Avatar con touch per il menu */}
        {user ? (
          <TouchableOpacity style={styles.avatar} onPress={() => setMenuVisible(true)}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        ) : (
             // ... login btn
             <TouchableOpacity style={styles.accessBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.accessText}>Accedi</Text>
             </TouchableOpacity>
        )}
      </View>

      {/* Dropdown Menu Modificato */}
      <Modal animationType="fade" transparent visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)} />
        <View style={styles.menuWrapRight}>
          
          {/* Se è Admin mostra Statistiche, altrimenti Area Personale */}
          {isAdmin ? (
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('AdminStats'); }}>
               <Ionicons name="stats-chart" size={18} color={COLORS.primary} />
               <Text style={styles.menuText}>Statistiche Admin</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('AreaPersonale'); }}>
               <Ionicons name="person" size={18} color={COLORS.primary} />
               <Text style={styles.menuText}>Area Personale</Text>
            </TouchableOpacity>
          )}

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
  header: { height: 90, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingTop: 30, flexDirection: 'row', alignItems: 'center', zIndex: 100 },
  left: { flex: 1, justifyContent: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minWidth: 80 },
  
  iconBtn: { marginRight: 12, padding: 5, position: 'relative' },
  badgeDot: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, borderWidth:1, borderColor: COLORS.primary },
  
  avatar: { width:38, height:38, borderRadius:19, backgroundColor:'#fff', justifyContent:'center', alignItems:'center', elevation:2 },
  avatarText: { color: COLORS.primary, fontWeight:'700', fontSize: 12 },
  
  accessBtn: { paddingVertical:6, paddingHorizontal:12, borderRadius:18, backgroundColor:'rgba(255,255,255,0.15)' },
  accessText: { color:'#fff', fontWeight:'700', fontSize: 13 },
  
  modalOverlay: { position:'absolute', top:0,left:0,right:0,bottom:0, backgroundColor:'rgba(0,0,0,0.3)' },
  menuWrapRight: { position:'absolute', top:84, right:12, width:180, backgroundColor:'#fff', borderRadius:8, padding:12, elevation:6 },
  menuItem: { flexDirection:'row', alignItems:'center', paddingVertical:12, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  menuText: { marginLeft:12, color:COLORS.primary, fontWeight:'600' }
});