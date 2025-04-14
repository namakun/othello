import { shallowMount } from '@vue/test-utils';
import ModeSelection from '@/components/ModeSelection.vue';
import ColorSelection from '@/components/ColorSelection.vue';
import { GAME_MODES } from '@/constants/gameConfig';

describe('ModeSelection.vue', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallowMount(ModeSelection);
  });

  describe('Initial State', () => {
    it('renders all game modes', () => {
      const modeOptions = wrapper.findAll('.mode-option');
      expect(modeOptions).toHaveLength(GAME_MODES.length);
    });

    it('starts with no selected mode', () => {
      expect(wrapper.vm.selectedMode).toBeNull();
      expect(wrapper.vm.playerColor).toBeNull();
    });

    it('disables start button initially', () => {
      const startButton = wrapper.find('.start-game-button');
      expect(startButton.attributes('disabled')).toBeDefined();
    });
  });

  describe('Mode Selection', () => {
    it('updates selected mode when clicking a mode option', async () => {
      const firstMode = wrapper.find('.mode-option');
      await firstMode.trigger('click');
      expect(wrapper.vm.selectedMode).toBe(GAME_MODES[0].id);
    });

    it('shows color selection only for CPU modes', async () => {
      // オフラインモード選択時
      await wrapper.setData({ selectedMode: 'offline' });
      expect(wrapper.findComponent(ColorSelection).exists()).toBe(false);

      // CPUモード選択時
      await wrapper.setData({ selectedMode: 'cpu-weak' });
      expect(wrapper.findComponent(ColorSelection).exists()).toBe(true);
    });

    it('automatically selects black color when selecting CPU mode', async () => {
      await wrapper.setData({ selectedMode: 'cpu-weak' });
      expect(wrapper.vm.playerColor).toBe('black');
    });
  });

  describe('Color Selection', () => {
    beforeEach(async () => {
      await wrapper.setData({ selectedMode: 'cpu-weak' });
    });

    it('updates player color when color is selected', async () => {
      const colorSelection = wrapper.findComponent(ColorSelection);
      await colorSelection.vm.$emit('color-selected', 'white');
      expect(wrapper.vm.playerColor).toBe('white');
    });

    it('resets color selection when switching to offline mode', async () => {
      await wrapper.setData({ playerColor: 'black' });
      await wrapper.vm.selectMode('offline');
      expect(wrapper.vm.playerColor).toBeNull();
    });
  });

  describe('Game Start', () => {
    it('emits mode-selected event with correct data for offline mode', async () => {
      await wrapper.setData({ selectedMode: 'offline' });
      await wrapper.find('.start-game-button').trigger('click');

      expect(wrapper.emitted('mode-selected')).toBeTruthy();
      expect(wrapper.emitted('mode-selected')[0][0]).toEqual({
        mode: 'offline',
        playerColor: null
      });
    });

    it('emits mode-selected event with correct data for CPU mode', async () => {
      await wrapper.setData({
        selectedMode: 'cpu-weak',
        playerColor: 'white'
      });
      await wrapper.find('.start-game-button').trigger('click');

      expect(wrapper.emitted('mode-selected')).toBeTruthy();
      expect(wrapper.emitted('mode-selected')[0][0]).toEqual({
        mode: 'cpu-weak',
        playerColor: 'white'
      });
    });
  });
});
