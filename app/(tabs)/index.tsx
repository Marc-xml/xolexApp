import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const OPERATIONS_URL = 'https://xolex-defacto.onrender.com/operations';

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

const getTypeAccent = (type) => {
  if (type === 'EXPEDITION') return { color: '#4f8cff', bg: '#eaf2ff', icon: 'rocket-outline' };
  if (type === 'RECEPTION') return { color: '#00b894', bg: '#e6f9f2', icon: 'cube-outline' };
  return { color: '#bbb', bg: '#f4f4f4', icon: 'help-circle-outline' };
};

export default function HomeScreen() {
  const [operations, setOperations] = useState([]);
  const [filteredOps, setFilteredOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState({ name: '' });
  const [search, setSearch] = useState('');
  const router = useRouter();

  const fetchOperations = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('xolex_jwt_token');
      if (token) {
        const userData = parseJwt(token);
        setUser(userData.user || { name: userData.name || 'User' });
      }
      const res = await fetch(OPERATIONS_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch operations');
      }
      const data = await res.json();
      setOperations(data.operations || data);
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);

  useEffect(() => {
    let filtered = operations;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(op =>
        (op.batch?.batchNumber?.toString().toLowerCase().includes(s) ||
         op.type?.toLowerCase().includes(s) ||
         op.status?.toLowerCase().includes(s) ||
         op.site?.toLowerCase().includes(s) ||
         op.destination?.toLowerCase().includes(s) ||
         op.quantity?.toString().includes(s))
      );
    }
    setFilteredOps(filtered);
  }, [search, operations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOperations();
  }, []);

  const renderItem = ({ item }) => {
    const accent = getTypeAccent(item.type);
    return (
      <View style={[styles.card, { backgroundColor: accent.bg, borderColor: accent.color }] }>
        <View style={[styles.cardAccent, { backgroundColor: accent.color }]} />
        <View style={{ flex: 1 }}>
          <View style={[styles.row, { marginBottom: 6, alignItems: 'center' }]}> 
            <Ionicons name={accent.icon} size={20} color={accent.color} style={{ marginRight: 8 }} />
            <Text style={[styles.operationType, { fontSize: 15, letterSpacing: 1, color: accent.color, textTransform: 'uppercase', fontWeight: 'bold' }]}>{item.type}</Text>
            {item.status && (
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'in-transit' ? '#ffe066' : item.status === 'completed' ? accent.color : '#ddd' }] }>
                <Text style={[styles.statusText, { color: item.status === 'in-transit' ? '#b48a00' : item.status === 'completed' ? '#fff' : '#555' }]}>{item.status}</Text>
              </View>
            )}
          </View>
          {item.batch?.batchNumber && (
            <Text style={{ fontWeight: '600', color: '#222', fontSize: 16, marginBottom: 2 }}>
              Batch: <Text style={{ color: accent.color, fontWeight: 'bold' }}>{item.batch.batchNumber}</Text>
            </Text>
          )}
          <View style={[styles.row, { marginBottom: 2 }]}> 
            <Text style={{ color: '#222', fontSize: 15 }}><Text style={{ color: '#888', fontWeight: '600' }}>Qty:</Text> {item.quantity}</Text>
            <Text style={{ color: '#222', fontSize: 15 }}><Text style={{ color: '#888', fontWeight: '600' }}>Site:</Text> {item.site}</Text>
          </View>
          <Text style={{ color: '#222', fontSize: 15, marginBottom: 2 }}><Text style={{ color: '#888', fontWeight: '600' }}>Destination:</Text> {item.destination}</Text>
          <Text style={{ color: '#b0b6c3', fontSize: 12, marginTop: 8, textAlign: 'right' }}>{new Date(item.date || item.createdAt).toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.gradientBg} />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user.name ? user.name[0].toUpperCase() : 'U'}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user.name || 'User'}</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={32} color="#4f8cff" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Xolex Operations</Text>
            <Text style={styles.infoDesc}>Track and manage your most recent receptions and expeditions. Use the button below to see all operations.</Text>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#222" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : filteredOps.length === 0 ? (
          <Text style={styles.empty}>No operations found.</Text>
        ) : (
          <FlatList
            data={filteredOps.slice(0, 5)}
            keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          />
        )}
        <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/operations')}>
          <Text style={styles.seeAllButtonText}>See All Operations</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: -1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  greeting: {
    color: '#888',
    fontSize: 15,
    marginBottom: 2,
  },
  userName: {
    color: '#222',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7faff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#4f8cff',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoTitle: {
    color: '#222',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  infoDesc: {
    color: '#888',
    fontSize: 14,
    lineHeight: 18,
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    color: '#222',
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  card: {
    backgroundColor: '#f9fafd',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#e3e7ef',
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    backgroundColor: '#4f8cff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  operationType: {
    fontSize: 15,
    color: '#4f8cff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  operationField: {
    fontSize: 15,
    color: '#333',
    marginBottom: 2,
  },
  label: {
    fontWeight: 'bold',
    color: '#888',
  },
  statusBadge: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  operationDate: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'right',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  seeAllButton: {
    backgroundColor: '#222',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  seeAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
});
