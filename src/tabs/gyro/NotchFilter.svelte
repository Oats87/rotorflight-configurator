<script>
  import { slide } from "svelte/transition";

  import Switch from "@/components/Switch.svelte";
  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";

  let { FC = $bindable() } = $props();

  const defaultValues = FC.getFilterDefaults();
  const previousValues = {};

  let notch1Enable = $derived(
    FC.FILTER_CONFIG.gyro_notch_hz > 0 &&
      FC.FILTER_CONFIG.gyro_notch_cutoff > 0,
  );
  let notch2Enable = $derived(
    FC.FILTER_CONFIG.gyro_notch2_hz > 0 &&
      FC.FILTER_CONFIG.gyro_notch2_cutoff > 0,
  );

  function loadValue(name) {
    FC.FILTER_CONFIG[name] =
      FC.FILTER_CONFIG[name] || previousValues[name] || defaultValues[name];
  }

  function toggleNotch1(enable) {
    if (enable) {
      loadValue("gyro_notch_hz");
      loadValue("gyro_notch_cutoff");
    } else {
      previousValues.gyro_notch_hz = FC.FILTER_CONFIG.gyro_notch_hz;
      previousValues.gyro_notch_cutoff = FC.FILTER_CONFIG.gyro_notch_cutoff;

      FC.FILTER_CONFIG.gyro_notch_hz = 0;
      FC.FILTER_CONFIG.gyro_notch_cutoff = 0;
    }
  }

  function toggleNotch2(enable) {
    if (enable) {
      loadValue("gyro_notch2_hz");
      loadValue("gyro_notch2_cutoff");
    } else {
      previousValues.gyro_notch2_hz = FC.FILTER_CONFIG.gyro_notch2_hz;
      previousValues.gyro_notch2_cutoff = FC.FILTER_CONFIG.gyro_notch2_cutoff;

      FC.FILTER_CONFIG.gyro_notch2_hz = 0;
      FC.FILTER_CONFIG.gyro_notch2_cutoff = 0;
    }
  }
</script>

<Section label="gyroNotchFilterHeading" summary="gyroNotchFilterHelp">
  <SubSection label="gyroNotchFilter1">
    <Field id="notch-filter-1-enable" label="genericEnable">
      <Switch
        id="notch-filter-1-enable"
        bind:checked={() => notch1Enable, toggleNotch1}
      />
    </Field>
    {#if notch1Enable}
      <div transition:slide>
        <SubSection>
          <Field
            id="notch-filter-1-center"
            label="gyroNotchFilterFrequency"
            unit="Hz"
          >
            <NumberInput
              id="notch-filter-1-center"
              min="0"
              max="1000"
              bind:value={FC.FILTER_CONFIG.gyro_notch_hz}
            />
          </Field>
          <Field
            id="notch-filter-1-cutoff"
            label="gyroNotchFilterCutoff"
            unit="Hz"
          >
            <NumberInput
              id="notch-filter-1-cutoff"
              min="0"
              max="1000"
              bind:value={FC.FILTER_CONFIG.gyro_notch_cutoff}
            />
          </Field>
        </SubSection>
      </div>
    {/if}
  </SubSection>
  <SubSection label="gyroNotchFilter2">
    <Field id="notch-filter-2-enable" label="genericEnable">
      <Switch
        id="notch-filter-2-enable"
        bind:checked={() => notch2Enable, toggleNotch2}
      />
    </Field>
    {#if notch2Enable}
      <div transition:slide>
        <SubSection>
          <Field
            id="notch-filter-2-center"
            label="gyroNotchFilterFrequency"
            unit="Hz"
          >
            <NumberInput
              id="notch-filter-2-center"
              min="0"
              max="1000"
              bind:value={FC.FILTER_CONFIG.gyro_notch2_hz}
            />
          </Field>
          <Field
            id="notch-filter-2-cutoff"
            label="gyroNotchFilterCutoff"
            unit="Hz"
          >
            <NumberInput
              id="notch-filter-2-cutoff"
              min="0"
              max="1000"
              bind:value={FC.FILTER_CONFIG.gyro_notch2_cutoff}
            />
          </Field>
        </SubSection>
      </div>
    {/if}
  </SubSection>
</Section>

<style lang="scss">
</style>
