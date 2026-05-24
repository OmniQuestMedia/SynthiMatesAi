// ui/app/creator/settings/page.ts
// PHASE 3 ITEM 4: Creator settings page with AI Synthetic Twin toggle
// Follows render-plan convention: no JSX, structurally-testable RenderElement tree

import { el, RenderElement } from '../../../components/render-plan';
import { SEO } from '../../../config/seo';

export const CREATOR_SETTINGS_PAGE_RULE_ID = 'CREATOR_SETTINGS_PAGE_v1';

export interface CreatorSettingsInputs {
  creator_id: string;
  creator_name: string;
  ai_synthetic_enabled: boolean;
  creator_auto: boolean;
}

export interface CreatorSettingsPageRender {
  metadata: typeof SEO.creator_settings;
  tree: RenderElement;
  rule_applied_id: string;
}

export function renderCreatorSettingsPage(
  inputs: CreatorSettingsInputs,
): CreatorSettingsPageRender {
  const tree = el(
    'main',
    {
      test_id: 'creator-settings-page',
      classes: ['cnz-creator-settings', 'cnz-theme-dark'],
      props: {
        creator_id: inputs.creator_id,
      },
    },
    [renderPageHeader(inputs.creator_name), renderFeatureToggles(inputs)],
  );

  return {
    metadata: SEO.creator_settings || {
      title: 'Creator Settings',
      description: 'Manage your creator features and preferences',
    },
    tree,
    rule_applied_id: CREATOR_SETTINGS_PAGE_RULE_ID,
  };
}

function renderPageHeader(creatorName: string): RenderElement {
  return el(
    'header',
    {
      test_id: 'creator-settings-header',
      classes: ['cnz-creator-settings__header'],
    },
    [
      el('h1', { test_id: 'creator-settings-title' }, ['Creator Settings']),
      el('p', { classes: ['cnz-creator-settings__subtitle'] }, [
        `Manage features and preferences for ${creatorName}`,
      ]),
    ],
  );
}

function renderFeatureToggles(inputs: CreatorSettingsInputs): RenderElement {
  return el(
    'section',
    {
      test_id: 'creator-feature-toggles',
      classes: ['cnz-creator-settings__toggles'],
      aria: { 'aria-label': 'Feature toggles' },
    },
    [
      el('h2', {}, ['Feature Toggles']),
      el(
        'div',
        {
          classes: ['cnz-settings-grid'],
        },
        [
          renderToggleCard(
            'ai-synthetic',
            'AI Synthetic Twin Generation',
            'Allow fans to generate AI images using Safe Synthetic Twin technology in chat',
            inputs.ai_synthetic_enabled,
            inputs.creator_id,
          ),
          renderToggleCard(
            'creator-auto',
            'Creator Auto-Response',
            'Automatically respond to chat messages using your persona when offline',
            inputs.creator_auto,
            inputs.creator_id,
          ),
        ],
      ),
    ],
  );
}

function renderToggleCard(
  featureKey: string,
  title: string,
  description: string,
  enabled: boolean,
  creatorId: string,
): RenderElement {
  return el(
    'div',
    {
      test_id: `creator-toggle-${featureKey}`,
      classes: ['cnz-toggle-card'],
    },
    [
      el(
        'div',
        {
          classes: ['cnz-toggle-card__content'],
        },
        [
          el('h3', { classes: ['cnz-toggle-card__title'] }, [title]),
          el('p', { classes: ['cnz-toggle-card__description'] }, [description]),
        ],
      ),
      el(
        'div',
        {
          classes: ['cnz-toggle-card__control'],
        },
        [
          el(
            'label',
            {
              test_id: `creator-toggle-${featureKey}-label`,
              classes: ['cnz-toggle-switch'],
              props: {
                for: `toggle-${featureKey}`,
              },
            },
            [
              el(
                'input',
                {
                  test_id: `creator-toggle-${featureKey}-input`,
                  classes: ['cnz-toggle-switch__input'],
                  props: {
                    type: 'checkbox',
                    id: `toggle-${featureKey}`,
                    checked: enabled,
                    'data-creator-id': creatorId,
                    'data-feature-key': featureKey,
                  },
                  on: { change: 'toggleFeature' },
                  aria: {
                    'aria-label': `Toggle ${title}`,
                    'aria-checked': enabled ? 'true' : 'false',
                  },
                },
                [],
              ),
              el(
                'span',
                {
                  classes: ['cnz-toggle-switch__slider'],
                },
                [],
              ),
              el(
                'span',
                {
                  classes: ['cnz-toggle-switch__label'],
                },
                [enabled ? 'Enabled' : 'Disabled'],
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
