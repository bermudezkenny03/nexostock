import { describe, expect, it } from 'vitest';
import Column from 'primevue/column';
import { defineComponent, h } from 'vue';
import AppDataTable from '@/shared/ui/AppDataTable.vue';
import AppFormField from '@/shared/ui/AppFormField.vue';
import AppPermissionGate from '@/shared/ui/AppPermissionGate.vue';
import AppStatusBadge from '@/shared/ui/AppStatusBadge.vue';
import { mountWithApp } from '../../utils/mount';

function gate(permissions: string[] | string, mode: 'any' | 'all' = 'any') {
  return defineComponent({
    render: () =>
      h(AppPermissionGate, { permissions, mode }, { default: () => 'allowed', fallback: () => 'denied' }),
  });
}

describe('AppPermissionGate', () => {
  it('renders the default slot when any permission matches', async () => {
    const { wrapper } = await mountWithApp(gate(['products.manage', 'sales.manage']), {
      permissions: ['sales.manage'],
    });

    expect(wrapper.text()).toBe('allowed');
  });

  it('renders the fallback when permissions are missing', async () => {
    const { wrapper } = await mountWithApp(gate('products.manage'), { permissions: ['products.view'] });

    expect(wrapper.text()).toBe('denied');
  });

  it('supports all-of mode', async () => {
    const { wrapper } = await mountWithApp(gate(['a', 'b'], 'all'), { permissions: ['a'] });

    expect(wrapper.text()).toBe('denied');
  });
});

describe('AppStatusBadge', () => {
  it('maps booleans and status codes to labels', async () => {
    const active = await mountWithApp(AppStatusBadge, { mountOptions: { props: { status: true } } });
    const cancelled = await mountWithApp(AppStatusBadge, { mountOptions: { props: { status: 'CANCELLED' } } });

    expect(active.wrapper.text()).toBe('Activo');
    expect(cancelled.wrapper.text()).toBe('Cancelada');
  });
});

describe('AppFormField', () => {
  it('links the error message to the control for assistive technologies', async () => {
    const { wrapper } = await mountWithApp(AppFormField, {
      mountOptions: {
        props: { id: 'sku', label: 'SKU', error: 'Ingresa el SKU', required: true },
        slots: {
          default: (field: { id: string; invalid: boolean; describedBy?: string }) =>
            h('input', { id: field.id, 'aria-invalid': field.invalid, 'aria-describedby': field.describedBy }),
        },
      },
    });

    const input = wrapper.get('input');
    expect(input.attributes('aria-describedby')).toBe('sku-error');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('#sku-error').attributes('role')).toBe('alert');
    expect(wrapper.get('label').attributes('for')).toBe('sku');
  });
});

describe('AppDataTable', () => {
  const Table = defineComponent({
    props: { error: { type: String, default: null }, value: { type: Array, default: () => [] } },
    emits: ['retry'],
    setup(props, { emit }) {
      return () =>
        h(
          AppDataTable,
          {
            value: props.value as object[],
            dataKey: 'id',
            error: props.error,
            tableLabel: 'Tabla',
            emptyTitle: 'Nada por aquí',
            onRetry: () => emit('retry'),
          },
          { default: () => h(Column, { field: 'name', header: 'Nombre' }) },
        );
    },
  });

  it('shows the error state with a retry action', async () => {
    const { wrapper } = await mountWithApp(Table, { mountOptions: { props: { error: 'Servicio caído' } } });

    expect(wrapper.text()).toContain('Servicio caído');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });

  it('shows the empty state', async () => {
    const { wrapper } = await mountWithApp(Table);

    expect(wrapper.text()).toContain('Nada por aquí');
  });

  it('renders rows', async () => {
    const { wrapper } = await mountWithApp(Table, { mountOptions: { props: { value: [{ id: 1, name: 'Arroz' }] } } });

    expect(wrapper.get('table').attributes('aria-label')).toBe('Tabla');
    expect(wrapper.text()).toContain('Arroz');
  });
});
