import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, RefreshControl, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
const OPERATIONS_URL = 'https://xolex-defacto.onrender.com/operations';

function parseJwt(token: string) {
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

export default function OperationsScreen() {
  const [operations, setOperations] = useState<any[]>([]);
  const [filteredOps, setFilteredOps] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [user, setUser] = useState<{ name: string }>({ name: '' });
  const [search, setSearch] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [receptionModalVisible, setReceptionModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [qrError, setQrError] = useState('');
  const [qrSuccess, setQrSuccess] = useState('');
  const [loadingReception, setLoadingReception] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualTrackingId, setManualTrackingId] = useState('');
  const [manualReceptionLoading, setManualReceptionLoading] = useState(false);
  const [manualReceptionError, setManualReceptionError] = useState('');
  const [manualReceptionSuccess, setManualReceptionSuccess] = useState('');

  const fetchOperations = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('xolex_jwt_token');
      let userId = undefined;
      if (token) {
        const userData = parseJwt(token);
        setUser(userData.user || { name: userData.name || 'User' });
        userId = userData.user?.id || userData.id;
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
      let ops = data.operations || data;
      if (userId) {
        ops = ops.filter((op: any) => op.userId === userId);
      }
      setOperations(ops);
    } catch (err: any) {
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
      filtered = filtered.filter((op: any) =>
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

  const totalExpeditions = operations.filter(op => op.type === 'EXPEDITION').length;
  const totalReceptions = operations.filter(op => op.type !== 'EXPEDITION').length;

  const getTypeAccent = (type: string) => {
    if (type === 'EXPEDITION') return { color: '#4f8cff', bg: '#eaf2ff', icon: 'rocket-outline' };
    if (type === 'RECEPTION') return { color: '#00b894', bg: '#e6f9f2', icon: 'cube-outline' };
    return { color: '#bbb', bg: '#f4f4f4', icon: 'help-circle-outline' };
  };

  const renderItem = ({ item }: { item: any }) => {
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

  const handleReception = () => {
    setModalVisible(false);
    setTimeout(() => setReceptionModalVisible(true), 300);
  };

  useEffect(() => {
    if (!qrModalVisible) {
      setScanned(false);
      setQrError('');
      setQrSuccess('');
    }
  }, [qrModalVisible]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setQrError('');
    setQrSuccess('');
    setLoadingReception(true);
    try {
      const token = await AsyncStorage.getItem('xolex_jwt_token');
      if (!token) throw new Error('User not authenticated');
      const userData = parseJwt(token as string);
      const userId = userData.user?.id || userData.id;
      const expedition = operations.find(
        (op) => op.name === data && op.type === 'EXPEDITION' && op.status === 'in-transit'
      );
      if (!expedition) {
        throw new Error('No matching expedition found for this QR code.');
      }
      const operationId = expedition.id;
      const res = await fetch('https://xolex-defacto.onrender.com/operations/reception', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operationId, userId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Reception failed');
      }
      setQrSuccess('Reception successful!');
      setTimeout(() => {
        setQrModalVisible(false);
        setScanned(false);
        fetchOperations();
      }, 800);
    } catch (err: any) {
      setQrError(err.message || 'Reception failed');
    } finally {
      setLoadingReception(false);
    }
  };

  const handleManualReception = async () => {
    setManualReceptionError('');
    setManualReceptionSuccess('');
    setManualReceptionLoading(true);
    try {
      const token = await AsyncStorage.getItem('xolex_jwt_token');
      if (!token) throw new Error('User not authenticated');
      const userData = parseJwt(token as string);
      const userId = userData.user?.id || userData.id;
      const expedition = operations.find(
        (op) => op.name === manualTrackingId && op.type === 'EXPEDITION' && op.status === 'in-transit'
      );
      if (!expedition) {
        throw new Error('No matching expedition found for this tracking ID.');
      }
      const operationId = expedition.id;
      const res = await fetch('https://xolex-defacto.onrender.com/operations/reception', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operationId, userId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Reception failed');
      }
      setManualReceptionSuccess('Reception successful!');
      setTimeout(() => {
        setManualModalVisible(false);
        setManualTrackingId('');
        fetchOperations();
      }, 800);
    } catch (err: any) {
      setManualReceptionError(err.message || 'Reception failed');
    } finally {
      setManualReceptionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.gradientBgModern} />
      <View style={styles.containerModern}>
        <Text style={styles.headerModern}>All Operations</Text>
        <View style={styles.summaryRowModern}>
          <View style={styles.summaryCardModern}>
            <Text style={styles.summaryTitleModern}>Total Expeditions</Text>
            <Text style={styles.summaryValueModern}>{totalExpeditions}</Text>
          </View>
          <View style={styles.summaryCardModern}>
            <Text style={styles.summaryTitleModern}>Total Receptions</Text>
            <Text style={styles.summaryValueModern}>{totalReceptions}</Text>
          </View>
        </View>
        <View style={styles.searchFilterRowModern}>
          <TextInput
            style={styles.searchBarModern}
            placeholder="Search operations..."
            placeholderTextColor="#888"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#222" style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : filteredOps.length === 0 ? (
          <Text style={styles.empty}>{'No operations found.'}</Text>
        ) : (
          <FlatList
            data={filteredOps}
            keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
        <TouchableOpacity style={styles.fabModern} activeOpacity={0.8} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentModern}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="add-circle-outline" size={40} color="#000" />
              </View>
              <Text style={styles.modalTitleModern}>New Operation</Text>
              {/* <Text style={styles.modalSubtitle}>What type of operation do you want to add?</Text> */}
              {/* <TouchableOpacity style={styles.modalActionBtnBW} activeOpacity={0.85} onPress={() => setModalVisible(false)}>
                <Ionicons name="rocket-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.modalActionTextBW}>Expedition</Text>
              </TouchableOpacity> */}
              <TouchableOpacity style={styles.modalActionBtnAltBW} activeOpacity={0.85} onPress={handleReception}>
                <Ionicons name="cube-outline" size={22} color="#222" style={{ marginRight: 8 }} />
                <Text style={styles.modalActionTextAltBW}>Reception</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelModern} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelTextModern}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal
          visible={receptionModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReceptionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentModern}>
              <Text style={styles.modalTitleModern}>Reception</Text>
              <Text style={styles.modalSubtitle}>Choose how to provide the tracking ID:</Text>
              <TouchableOpacity style={styles.modalActionBtnBW} activeOpacity={0.85} onPress={() => { setReceptionModalVisible(false); setTimeout(() => setManualModalVisible(true), 300); }}>
                <Ionicons name="key-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.modalActionTextBW}>Enter Tracking ID</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalActionBtnAltBW} activeOpacity={0.85} onPress={() => {
                setReceptionModalVisible(false);
                setTimeout(() => {
                  setQrModalVisible(true);
                }, 300);
              }}>
                <Ionicons name="qr-code-outline" size={22} color="#222" style={{ marginRight: 8 }} />
                <Text style={styles.modalActionTextAltBW}>Scan QR Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelModern} onPress={() => setReceptionModalVisible(false)}>
                <Text style={styles.modalCancelTextModern}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal
          visible={qrModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => { setQrModalVisible(false); setScanned(false); }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContentModern, { padding: 0, width: 340, height: 420, justifyContent: 'flex-start' }]}> 
              <Text style={[styles.modalTitleModern, { marginTop: 18 }]}>Scan Tracking QR Code</Text>
              {!permission ? (
                <Text style={styles.modalSubtitle}>Requesting camera permission...</Text>
              ) : !permission.granted ? (
                <>
                  <Text style={styles.modalSubtitle}>No access to camera. Please enable camera permissions in your settings.</Text>
                  <TouchableOpacity style={styles.modalActionBtnBW} onPress={requestPermission}>
                    <Text style={styles.modalActionTextBW}>Grant Permission</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <CameraView
                  style={{ width: 260, height: 260, alignSelf: 'center', borderRadius: 18, overflow: 'hidden', marginVertical: 18 }}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={scanned ? undefined : ({ data }) => handleBarCodeScanned({ data })}
                />
              )}
              {loadingReception && <ActivityIndicator size="small" color="#000" style={{ marginTop: 8 }} />}
              {qrSuccess ? <Text style={{ color: 'green', marginTop: 8 }}>{qrSuccess}</Text> : null}
              {qrError ? <Text style={{ color: 'red', marginTop: 8 }}>{qrError}</Text> : null}
              <TouchableOpacity style={styles.modalCancelModern} onPress={() => { setQrModalVisible(false); setScanned(false); }}>
                <Text style={styles.modalCancelTextModern}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal
          visible={manualModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setManualModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentModern}>
              <Text style={styles.modalTitleModern}>Reception by Tracking ID</Text>
              <Text style={styles.modalSubtitle}>Enter the tracking ID for the expedition:</Text>
              <TextInput
                style={{
                  width: '100%',
                  height: 48,
                  fontSize: 18,
                  backgroundColor: '#fff',
                  color: '#222',
                  borderColor: '#ccc',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  marginBottom: 14,
                }}
                placeholder="Tracking ID..."
                placeholderTextColor="#888"
                value={manualTrackingId}
                onChangeText={setManualTrackingId}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor="#222"
                accessible
                accessibilityLabel="Tracking ID input"
                returnKeyType="done"
                textContentType="none"
                keyboardType="default"
              />
              {manualReceptionLoading && <ActivityIndicator size="small" color="#000" style={{ marginTop: 8 }} />}
              {manualReceptionSuccess ? <Text style={{ color: 'green', marginTop: 8 }}>{manualReceptionSuccess}</Text> : null}
              {manualReceptionError ? <Text style={{ color: 'red', marginTop: 8 }}>{manualReceptionError}</Text> : null}
              <TouchableOpacity
                style={styles.modalActionBtnBW}
                activeOpacity={0.85}
                onPress={handleManualReception}
                disabled={manualReceptionLoading || !manualTrackingId.trim()}
              >
                <Ionicons name="cube-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.modalActionTextBW}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelModern} onPress={() => setManualModalVisible(false)}>
                <Text style={styles.modalCancelTextModern}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradientBgModern: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f7f7f7',
    zIndex: -1,
  },
  containerModern: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 24,
  },
  headerModern: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  summaryRowModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    gap: 16,
  },
  summaryCardModern: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryTitleModern: {
    color: '#888',
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '600',
  },
  summaryValueModern: {
    color: '#111',
    fontSize: 26,
    fontWeight: 'bold',
  },
  searchFilterRowModern: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 2,
  },
  searchBarModern: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 17,
    color: '#222',
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
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
    marginBottom: 8,
  },
  operationType: {
    fontSize: 16,
    color: '#111',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
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
    marginTop: 10,
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
  fabModern: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#000',
    borderRadius: 32,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentModern: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 32,
    width: 320,
    alignItems: 'center',
    shadowColor: '#4f8cff',
    shadowOpacity: 0.13,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalIconCircle: {
    backgroundColor: '#f4f4f4',
    borderRadius: 32,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitleModern: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 15,
    marginBottom: 22,
    textAlign: 'center',
  },
  modalActionBtnBW: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 14,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modalActionTextBW: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  modalActionBtnAltBW: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 10,
    width: '100%',
    justifyContent: 'center',
  },
  modalActionTextAltBW: {
    color: '#222',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  modalCancelModern: {
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  modalCancelTextModern: {
    color: '#888',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     