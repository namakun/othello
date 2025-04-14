import { shallowMount } from '@vue/test-utils';
import ColorSelection from '@/components/ColorSelection.vue';

describe('ColorSelection.vue', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallowMount(ColorSelection, {
      propsData: {
        selectedColor: null
      }
    });
  });

  describe('Rendering', () => {
    it('renders both color options', () => {
      const colorOptions = wrapper.findAll('.color-option');
      expect(colorOptions).toHaveLength(2);
    });

    it('displays correct labels for each color', () => {
      const labels = wrapper.findAll('.color-label');
      expect(labels.at(0).text()).toBe('黒（先攻）');
      expect(labels.at(1).text()).toBe('白（後攻）');
    });
  });

  describe('Color Selection', () => {
    it('applies selected class to black option when black is selected', async () => {
      await wrapper.setProps({ selectedColor: 'black' });
      const blackOption = wrapper.findAll('.color-option').at(0);
      expect(blackOption.classes()).toContain('selected');
    });

    it('applies selected class to white option when white is selected', async () => {
      await wrapper.setProps({ selectedColor: 'white' });
      const whiteOption = wrapper.findAll('.color-option').at(1);
      expect(whiteOption.classes()).toContain('selected');
    });

    it('emits color-selected event when black is clicked', async () => {
      const blackOption = wrapper.findAll('.color-option').at(0);
      await blackOption.trigger('click');
      expect(wrapper.emitted('color-selected')).toBeTruthy();
      expect(wrapper.emitted('color-selected')[0]).toEqual(['black']);
    });

    it('emits color-selected event when white is clicked', async () => {
      const whiteOption = wrapper.findAll('.color-option').at(1);
      await whiteOption.trigger('click');
      expect(wrapper.emitted('color-selected')).toBeTruthy();
      expect(wrapper.emitted('color-selected')[0]).toEqual(['white']);
    });
  });

  describe('Prop Validation', () => {
    it('validates selectedColor prop', () => {
      const { validator } = wrapper.vm.$options.props.selectedColor;
      expect(validator('black')).toBe(true);
      expect(validator('white')).toBe(true);
      expect(validator(null)).toBe(true);
      expect(validator('invalid')).toBe(false);
    });
  });
});
