import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  mode: 'date' | 'time';
  value: Date;
  onChange: (d: Date) => void;
};

function label(d: Date, mode: 'date' | 'time') {
  return mode === 'time'
    ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

export function DateTimeField({ mode, value, onChange }: Props) {
  // iOS: inline compact picker chip that manages its own popover.
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.iosRow}>
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onChange={(_event, d) => {
            if (d) onChange(d);
          }}
        />
      </View>
    );
  }

  // Android: a field that opens the native dialog.
  const open = () =>
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: false,
      onChange: (_event, d) => {
        if (d) onChange(d);
      },
    });

  return (
    <Pressable style={styles.field} onPress={open}>
      <Text style={styles.value}>{label(value, mode)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iosRow: { alignItems: 'flex-start', marginBottom: 18, marginTop: -4 },
  field: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5DDF5',
    marginBottom: 18,
  },
  value: { fontSize: 16, color: '#1F1438' },
});
